import { expect, test } from "@playwright/test";

// Core user journey: login → create recap → pick team → generate → watch.
test.describe("recap flow", () => {
  test("landing page communicates the product instantly", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Your World Cup/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Create My Recap/i }).first()).toBeVisible();
  });

  test("public demo works without sign-in", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText(/Argentina/i).first()).toBeVisible();
  });

  test("login → create → generate → recap appears", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("demo@worldcup.ai");
    await page.getByLabel(/password/i).fill("demo1234");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();

    await page.goto("/create");
    await page.getByRole("button", { name: /World Cup 2026/ }).first().click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.getByRole("button", { name: /India/ }).first().click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.getByRole("button", { name: /Team Journey/ }).click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.getByRole("button", { name: /Exciting/ }).click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.getByRole("button", { name: /Short/ }).click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.getByRole("button", { name: /Generate My Recap/ }).click();

    // Progress view or ready view
    await expect(
      page.getByText(/World Cup story/i).or(page.getByText(/Tournament Summary/i)),
    ).toBeVisible({ timeout: 15_000 });
  });
});
