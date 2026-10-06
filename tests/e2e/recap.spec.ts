import { test, expect } from "@playwright/test";

/**
 * E2E: the golden path — demo login → dashboard → create wizard →
 * generate → recap detail with video.
 *
 * Run:  npx playwright install chromium && npm run e2e
 * Requires: dev DB + `npm run dev` (Playwright starts its own server
 * via webServer config if not already running).
 */

test.describe("golden path", () => {
  test("landing page communicates the product in 10 seconds", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Your World Cup/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Create My Recap/i }).first(),
    ).toBeVisible();
  });

  test("demo login → create → generate → watch recap", async ({ page }) => {
    test.setTimeout(240_000); // video generation takes real time

    await page.goto("/login");
    await page.getByRole("button", { name: /demo login/i }).click();
    await expect(page).toHaveURL(/dashboard/);

    await page.goto("/create");
    // Step 1: tournament (first option already selected)
    await page.getByRole("button", { name: 'Next', exact: true }).click();
    // Step 2: subject — pick India
    await page.getByRole("button", { name: /India/ }).click();
    await page.getByRole("button", { name: 'Next', exact: true }).click();
    // Step 3: type — Team Journey default
    await page.getByRole("button", { name: 'Next', exact: true }).click();
    // Step 4: tone — Exciting default
    await page.getByRole("button", { name: 'Next', exact: true }).click();
    // Step 5: length — Standard default
    await page.getByRole("button", { name: 'Next', exact: true }).click();
    // Step 6: generate
    await page.getByRole("button", { name: /Generate My Recap/i }).click();

    // Status tracker appears with real stages
    await expect(
      page.getByText(/Creating your World Cup story/i),
    ).toBeVisible({ timeout: 15_000 });

    // Eventually completes → recap view with video
    await expect(page.locator("video")).toBeVisible({ timeout: 200_000 });
    await expect(
      page.getByRole("heading", { name: /Biggest Moments/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Share Recap/i }),
    ).toBeVisible();
  });
});
