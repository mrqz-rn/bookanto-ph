import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Expects the demo data from `pnpm db:seed`.

test("home page has one heading and no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("search goes to the results page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "What service do you need?" }).fill("haircut");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search\?q=haircut$/);
});

test("choosing a city shows popular shops near it, and is remembered", async ({ page }) => {
  await page.goto("/");
  const nearby = page.getByRole("region", { name: "Popular near you" });
  await nearby.getByLabel("Or choose your city").selectOption({ label: "Marikina" });

  await expect(nearby.getByText("Near Marikina")).toBeVisible();
  await expect(nearby.getByRole("link").first()).toBeVisible();
  await expect(nearby.getByText(/km away|m away/).first()).toBeVisible();

  await page.reload();
  await expect(nearby.getByText("Near Marikina")).toBeVisible();
});

test("pages are served with security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["set-cookie"]).toBeUndefined();
});

test("signed-in areas send guests to log in", async ({ page }) => {
  const response = await page.request.get("/account", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toContain("/login?next=%2Faccount");
});
