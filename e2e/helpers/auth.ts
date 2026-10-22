import { expect, type Page } from "@playwright/test";
import { BASE_URL } from "./config.ts";

// Drives the full magic-link flow: request a link for `email` and land on the
// authenticated app (some full-screen Panel visible). Outside production, the
// API returns a `devToken` alongside its response and the auth saga
// auto-verifies with it immediately (skipping the "login link has been sent"
// message) rather than requiring a human to go dig the link out of an
// email/console — see backend/src/application/auth/auth.use-cases.ts's
// requestMagicLink.
//
// Waits for ".panel" rather than ".bottom-nav": BottomNav only renders itself
// while the topmost window is Map/Organizations/Accounts (see BottomNav.tsx),
// and a second loginAs within one test (after logout()'s localStorage-only
// sign-out, which never touches the restored window stack) can land back on
// whatever window — e.g. a form — was last open, not necessarily one of those
// three. Every authenticated screen is a Panel regardless of which one.
export async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto(BASE_URL);
  await expect(page.locator("text=Sign in")).toBeVisible({ timeout: 15000 });
  await page.fill("#login-email", email);
  await page.click('button:has-text("Send login link")');
  await expect(page.locator(".panel").first()).toBeVisible({ timeout: 15000 });
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.removeItem("authToken"));
}
