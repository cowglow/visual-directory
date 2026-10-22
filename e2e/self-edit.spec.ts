import { test, expect } from "@playwright/test";
import { SEED_LEADER_EMAIL } from "./helpers/config.ts";
import { loginAs, logout } from "./helpers/auth.ts";
import { uniqueEmail, uniqueName } from "./helpers/test-data.ts";
import { addMemberViaMap, editSelectedMemberFromPreview, openAccounts, selectMemberInTree } from "./helpers/map.ts";

test("a member linked to their own record can edit it but not others, and cannot delete it", async ({ page }) => {
  const ownFirstName = uniqueName("Alex");
  const ownFullName = `${ownFirstName} Rivera`;
  const otherFirstName = uniqueName("Jordan");
  const otherFullName = `${otherFirstName} Kim`;
  const selfEmail = uniqueEmail("selfedit");

  await test.step("leader logs in", async () => {
    await loginAs(page, SEED_LEADER_EMAIL);
  });

  await test.step("leader creates the member the invitee will be linked to", async () => {
    await addMemberViaMap(page, { firstName: ownFirstName, lastName: "Rivera", xRatio: 0.4, yRatio: 0.4 });
  });

  await test.step("leader creates a second, unrelated member", async () => {
    await addMemberViaMap(page, { firstName: otherFirstName, lastName: "Kim", xRatio: 0.6, yRatio: 0.6 });
  });

  await test.step("leader invites a member-role account linked to the first member", async () => {
    await openAccounts(page);
    await page.click('button:has-text("Invite Account")');
    await expect(page.locator("#invite-email")).toBeVisible({ timeout: 5000 });
    await page.fill("#invite-email", selfEmail);
    await page.selectOption("#invite-role", "member");
    await page.selectOption("#invite-member", { label: `${ownFirstName} Rivera` });
    await page.click('button:has-text("Send invite")');
    await expect(page.locator(`text=Invited ${selfEmail}`)).toBeVisible({ timeout: 5000 });
  });

  await test.step("invited account logs in", async () => {
    await logout(page);
    await loginAs(page, selfEmail);
  });

  await test.step("own record: Edit is available, Remove is not", async () => {
    await selectMemberInTree(page, ownFullName);
    await editSelectedMemberFromPreview(page);
    await expect(page.locator('button:has-text("Remove")')).toHaveCount(0);
    await page.fill("#member-telephone", "555-0100");
    await page.click('button[type="submit"]:has-text("Save")');
    await expect(page.locator("#member-first-name")).toHaveCount(0, { timeout: 5000 });
  });

  await test.step("the edit persisted", async () => {
    await selectMemberInTree(page, ownFullName);
    await editSelectedMemberFromPreview(page);
    await expect(page.locator("#member-telephone")).toHaveValue("555-0100");
    await page.click('button:has-text("Cancel")');
  });

  await test.step("someone else's record: no Edit button at all", async () => {
    await selectMemberInTree(page, otherFullName);
    await expect(page.locator(".org-preview-card button:has-text('Edit')")).toHaveCount(0);
  });
});
