import { test, expect } from "@playwright/test";
import { SEED_LEADER_EMAIL } from "./helpers/config.ts";
import { loginAs, logout } from "./helpers/auth.ts";
import { uniqueEmail, uniqueName } from "./helpers/test-data.ts";
import { clickMap, goToMap, openAccounts, openOrganizationsTree } from "./helpers/map.ts";

test.beforeEach(async ({ page }) => {
  await loginAs(page, SEED_LEADER_EMAIL);
});

test("leader can create an organization and assign it to a member", async ({ page }) => {
  const orgName = uniqueName("District");

  await openOrganizationsTree(page);
  await page.click('button:has-text("Add Organization")');
  await expect(page.locator("#org-name")).toBeVisible({ timeout: 5000 });
  await page.fill("#org-name", orgName);
  await page.selectOption("#org-type", "District");
  await page.click('button[type="submit"]:has-text("Save")');
  await expect(page.locator("#org-name")).toHaveCount(0, { timeout: 5000 });

  await goToMap(page);
  await clickMap(page, 0.35, 0.35);
  await expect(page.locator("#member-first-name")).toBeVisible({ timeout: 5000 });

  const orgOptions = await page.locator("#member-organization option").allTextContents();
  expect(orgOptions.some((option) => option.includes(orgName))).toBe(true);
  await page.click('button:has-text("Cancel")');
});

test("leader can invite a new account which can then log in itself", async ({ page }) => {
  const email = uniqueEmail("invitee");

  await openAccounts(page);
  await page.click('button:has-text("Invite Account")');
  await expect(page.locator("#invite-email")).toBeVisible({ timeout: 5000 });
  await page.fill("#invite-email", email);
  await page.selectOption("#invite-role", "member");
  await page.click('button:has-text("Send invite")');
  await expect(page.locator(`text=Invited ${email}`)).toBeVisible({ timeout: 5000 });

  await logout(page);
  await loginAs(page, email);
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible();
});
