import { test, expect } from "@playwright/test";
import { BASE_URL, SEED_LEADER_EMAIL } from "./helpers/config.ts";
import { loginAs } from "./helpers/auth.ts";

test("shows the sign-in form when not authenticated", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator("text=Sign in")).toBeVisible({ timeout: 15000 });
});

test("the seeded leader can log in via magic link", async ({ page }) => {
  await loginAs(page, SEED_LEADER_EMAIL);
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible();
  await expect(page.locator(".bottom-nav-tab", { hasText: "Organizations" })).toBeVisible();
});
