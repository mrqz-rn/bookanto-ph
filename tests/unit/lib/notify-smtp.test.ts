import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock("nodemailer", () => ({ default: { createTransport } }));

const { env } = await import("@/lib/env");
const {
  configuredEmailProvider,
  emailProvider,
  emailSender,
  SmtpEmailProvider,
  smtpTransportOptions,
} = await import("@/lib/notify");

const EMAIL_KEYS = [
  "EMAIL_PROVIDER",
  "EMAIL_FROM",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
] as const;

type Mutable = Record<(typeof EMAIL_KEYS)[number], unknown>;
const settings = env as unknown as Mutable;
let saved: Partial<Mutable>;

beforeEach(() => {
  vi.clearAllMocks();
  saved = Object.fromEntries(EMAIL_KEYS.map((key) => [key, settings[key]]));
  for (const key of EMAIL_KEYS) settings[key] = undefined;
  settings.SMTP_PORT = 587;
});

afterEach(() => {
  Object.assign(settings, saved);
});

const message = { to: "customer@example.com", subject: "Receipt", html: "<p>Hi</p>", text: "Hi" };

describe("configuredEmailProvider", () => {
  it("uses EMAIL_PROVIDER when it's set", () => {
    settings.EMAIL_PROVIDER = "resend";
    settings.SMTP_HOST = "smtp.example.com";
    expect(configuredEmailProvider()).toBe("resend");
  });

  it("otherwise prefers SMTP, then Resend, then logging only", () => {
    expect(configuredEmailProvider()).toBe("log");
    settings.RESEND_API_KEY = "re_123";
    expect(configuredEmailProvider()).toBe("resend");
    settings.SMTP_HOST = "smtp.example.com";
    expect(configuredEmailProvider()).toBe("smtp");
  });
});

describe("emailSender", () => {
  it("reads EMAIL_FROM, then the older RESEND_FROM_EMAIL, then the default", () => {
    expect(emailSender()).toBe("BooKanto <notifications@bookanto.ph>");
    settings.RESEND_FROM_EMAIL = "Old <old@example.com>";
    expect(emailSender()).toBe("Old <old@example.com>");
    settings.EMAIL_FROM = "Shop <hello@example.com>";
    expect(emailSender()).toBe("Shop <hello@example.com>");
  });
});

describe("smtpTransportOptions", () => {
  it("uses STARTTLS on 587 and TLS from the start on 465", () => {
    settings.SMTP_HOST = "smtp.example.com";
    expect(smtpTransportOptions()).toMatchObject({ port: 587, secure: false, auth: undefined });
    settings.SMTP_PORT = 465;
    expect(smtpTransportOptions()).toMatchObject({ port: 465, secure: true });
    settings.SMTP_SECURE = false;
    expect(smtpTransportOptions().secure).toBe(false);
  });

  it("logs in only when a user is set", () => {
    settings.SMTP_HOST = "smtp.example.com";
    settings.SMTP_USER = "apikey";
    settings.SMTP_PASSWORD = "secret";
    expect(smtpTransportOptions().auth).toEqual({ user: "apikey", pass: "secret" });
  });
});

describe("SmtpEmailProvider", () => {
  it("sends through the SMTP server with the configured sender", async () => {
    settings.SMTP_HOST = "smtp.example.com";
    settings.EMAIL_FROM = "BooKanto <hello@example.com>";
    sendMail.mockResolvedValue({ messageId: "<abc@example.com>", rejected: [] });

    const result = await new SmtpEmailProvider().sendEmail(message);

    expect(result).toEqual({ success: true, messageId: "<abc@example.com>" });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.example.com", port: 587, pool: true }),
    );
    expect(sendMail).toHaveBeenCalledWith({ from: "BooKanto <hello@example.com>", ...message });
  });

  it("reports a refused recipient or a dropped connection as a failure", async () => {
    settings.SMTP_HOST = "smtp.example.com";
    const provider = new SmtpEmailProvider();

    sendMail.mockResolvedValueOnce({ messageId: "<x>", rejected: ["customer@example.com"] });
    expect((await provider.sendEmail(message)).success).toBe(false);

    sendMail.mockRejectedValueOnce(new Error("Connection timeout"));
    expect(await provider.sendEmail(message)).toEqual({
      success: false,
      messageId: "Connection timeout",
    });
  });

  it("refuses to send without a host", async () => {
    const result = await new SmtpEmailProvider().sendEmail(message);
    expect(result.success).toBe(false);
    expect(createTransport).not.toHaveBeenCalled();
  });
});

describe("emailProvider", () => {
  it("goes through SMTP when it's configured, and sends nothing when no service is", async () => {
    const logged = await emailProvider.sendEmail(message);
    expect(logged).toMatchObject({
      success: true,
      messageId: expect.stringMatching(/^sim_email_/),
    });
    expect(sendMail).not.toHaveBeenCalled();

    settings.SMTP_HOST = "smtp.example.com";
    sendMail.mockResolvedValue({ messageId: "<via-smtp>", rejected: [] });
    expect(await emailProvider.sendEmail(message)).toEqual({
      success: true,
      messageId: "<via-smtp>",
    });
  });
});

describe("email settings in lib/env.ts", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  async function loadEnv(values: Record<string, string>) {
    process.env = { ...original, ...values };
    vi.resetModules();
    return (await import("@/lib/env")).env;
  }

  it("reads empty values as unset and fills in the port", async () => {
    const loaded = await loadEnv({
      EMAIL_PROVIDER: "",
      SMTP_HOST: "",
      SMTP_PORT: "",
      SMTP_SECURE: "",
      SMTP_USER: "",
      SMTP_PASSWORD: "",
    });
    expect(loaded.EMAIL_PROVIDER).toBeUndefined();
    expect(loaded.SMTP_HOST).toBeUndefined();
    expect(loaded.SMTP_PORT).toBe(587);
    expect(loaded.SMTP_SECURE).toBeUndefined();
  });

  it("parses the port and the secure switch", async () => {
    const loaded = await loadEnv({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
    });
    expect(loaded.SMTP_PORT).toBe(465);
    expect(loaded.SMTP_SECURE).toBe(true);
  });

  it("stops the server when SMTP is chosen without a host", async () => {
    await expect(loadEnv({ EMAIL_PROVIDER: "smtp" })).rejects.toThrow(/SMTP_HOST/);
  });

  it("stops the server when TLS is forced on a STARTTLS port", async () => {
    await expect(
      loadEnv({ SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "587", SMTP_SECURE: "true" }),
    ).rejects.toThrow(/SMTP_SECURE: must be false on port 587/);
    const loaded = await loadEnv({
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
    });
    expect(loaded.SMTP_SECURE).toBe(true);
  });

  it("stops the server when only half of the login is set", async () => {
    await expect(loadEnv({ SMTP_HOST: "smtp.example.com", SMTP_USER: "me" })).rejects.toThrow(
      /SMTP_PASSWORD/,
    );
  });
});
