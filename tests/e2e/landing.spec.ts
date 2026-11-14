import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing page has one heading and no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  // Open every FAQ answer so axe checks them too.
  for (const summary of await page.locator("details summary").all()) await summary.click();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("header links jump to the contact form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Contact us" }).first().click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByRole("heading", { name: "Let's talk" })).toBeInViewport();
});

test("the contact form explains what's missing and keeps what was typed", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("#contact form");
  await form.getByLabel("Your name").fill("Jun");
  await form.getByLabel("Message").fill("hi");
  await form.getByRole("button", { name: "Send message" }).click();

  await expect(form.getByText("Add an email or a mobile number so we can reply")).toBeVisible();
  await expect(form.getByText("Tell us a little more")).toBeVisible();
  await expect(form.getByLabel("Your name")).toHaveValue("Jun");
  await expect(form.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
});

// Each run stores a message. Against the same database, the sixth run in an
// hour hits the 5-per-hour limit; clear the inquiries table between runs.
test("an investor can send a message", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("#contact form");
  await form.getByRole("radio", { name: /Investor/ }).check();
  await form.getByLabel("Your name").fill("Ana Santos");
  await form.getByLabel("Email").fill("ana@example.com");
  await form
    .getByLabel("Message")
    .fill("I'd like to learn more about the BooKanto pilot and your funding plans.");
  await form.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("status")).toContainText("Salamat! We got your message.");
});

test("displays mobile platform coming soon for Play Store and App store", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Mobile platform coming soon for Play Store and App store",
    }),
  ).toBeVisible();
  await expect(page.getByText("Google Play").first()).toBeVisible();
  await expect(page.getByText("App Store").first()).toBeVisible();
  await expect(page.getByText("Coming soon").first()).toBeVisible();
});
