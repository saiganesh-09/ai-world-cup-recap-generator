/**
 * Captures product screenshots into docs/screenshots (README assets).
 * Requires: dev server running on :3000 + seeded demo data.
 *
 * Usage: npx tsx scripts/screenshots.ts
 */
import { chromium } from "playwright";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(900); // let the hero fade-in finish
  await page.screenshot({ path: "docs/screenshots/landing.png" });
  console.log("landing");

  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: /demo login/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/screenshots/dashboard.png" });
  console.log("dashboard");

  await page.goto(`${BASE}/recaps`);
  await page.waitForLoadState("networkidle");
  await page.locator('a[href^="/recaps/"]').first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "docs/screenshots/recap.png" });
  console.log("recap");

  await page.goto(`${BASE}/create`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/screenshots/create.png" });
  console.log("create");

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "docs/screenshots/mobile.png" });
  console.log("mobile");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
