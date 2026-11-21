import "server-only";

import { escapeHtml } from "@/lib/notify";

import { PASSWORD_RESET_TTL_MINUTES } from "./constants";

type Email = { subject: string; html: string; text: string };

/** Same look as the Supabase sign-in emails in supabase/templates. */
function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title></head>
  <body style="margin: 0; padding: 0; background: #f4f7f4; font-family: Arial, Helvetica, sans-serif; color: #14213d">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f4f7f4; padding: 24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background: #ffffff; border-radius: 16px; padding: 32px 24px">
          <tr><td style="font-size: 22px; font-weight: 700; color: #14213d">Boo<span style="color: #16a34a">K</span>anto</td></tr>
          <tr><td style="padding-top: 24px; font-size: 18px; font-weight: 700">${title}</td></tr>
          ${body}
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const paragraph = (html: string) =>
  `<tr><td style="padding-top: 12px; font-size: 15px; line-height: 22px; color: #475569">${html}</td></tr>`;

export function passwordResetEmail({ name, link }: { name: string | null; link: string }): Email {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const minutes = PASSWORD_RESET_TTL_MINUTES;
  const html = layout(
    "Reset your password",
    [
      paragraph(escapeHtml(greeting)),
      paragraph(
        "Someone asked to reset the password for your BooKanto account. Tap the button to choose a new one.",
      ),
      `<tr><td style="padding-top: 20px"><a href="${escapeHtml(link)}" style="display: inline-block; background: #16a34a; color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 12px 22px; border-radius: 10px">Choose a new password</a></td></tr>`,
      paragraph(
        `The link works <strong>once</strong> and expires in <strong>${minutes} minutes</strong>.`,
      ),
      paragraph("If you didn't ask for this, ignore this email. Your password stays the same."),
    ].join("\n"),
  );
  const text = [
    greeting,
    "",
    "Someone asked to reset the password for your BooKanto account. Open this link to choose a new one:",
    link,
    "",
    `The link works once and expires in ${minutes} minutes.`,
    "If you didn't ask for this, ignore this email. Your password stays the same.",
  ].join("\n");
  return { subject: "Reset your BooKanto password", html, text };
}

export function passwordChangedEmail({ name }: { name: string | null }): Email {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const html = layout(
    "Your password was changed",
    [
      paragraph(escapeHtml(greeting)),
      paragraph(
        "The password for your BooKanto account was just changed, and you were signed out on your other devices.",
      ),
      paragraph(
        "If this wasn't you, reset your password right away from the BooKanto sign-in page and reply to this email.",
      ),
    ].join("\n"),
  );
  const text = [
    greeting,
    "",
    "The password for your BooKanto account was just changed, and you were signed out on your other devices.",
    "If this wasn't you, reset your password right away from the BooKanto sign-in page and reply to this email.",
  ].join("\n");
  return { subject: "Your BooKanto password was changed", html, text };
}
