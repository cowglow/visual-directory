import { test, expect } from "@playwright/test";
import { SEED_LEADER_EMAIL } from "./helpers/config.ts";
import { loginAs } from "./helpers/auth.ts";
import { uniqueName } from "./helpers/test-data.ts";
import { addMemberViaMap, closeMenu, openMenu, selectMemberInTree } from "./helpers/map.ts";

// Import replaces the roster wholesale (member.saga.ts's importMembersSaga: every
// existing member is deleted, then every row in the file is (re)created) — not a
// merge, and not a "skip rows whose id already exists" import. Re-importing a file
// exported before a second member was added should bring the roster back down to
// just what's in that file.
test("importing a CSV replaces the roster with exactly what's in the file", async ({
  page,
}, testInfo) => {
  await loginAs(page, SEED_LEADER_EMAIL);
  const keptName = uniqueName("Grace");
  const keptFullName = `${keptName} Kept`;
  const droppedName = uniqueName("Henry");
  const droppedFullName = `${droppedName} Dropped`;

  await addMemberViaMap(page, { firstName: keptName, lastName: "Kept", xRatio: 0.5, yRatio: 0.5 });

  await openMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("text=Export as CSV"),
  ]);
  const downloadPath = testInfo.outputPath("exported-members.csv");
  await download.saveAs(downloadPath);

  // Add a second member *after* exporting, so it exists in the app but not in
  // the downloaded file. openMenu left the Menu screen on top, not the map.
  await closeMenu(page);
  await addMemberViaMap(page, { firstName: droppedName, lastName: "Dropped", xRatio: 0.3, yRatio: 0.3 });

  await openMenu(page);
  await page.locator('input[type="file"]').setInputFiles(downloadPath);
  await page.waitForTimeout(1000);
  await closeMenu(page);

  await selectMemberInTree(page, keptFullName);
  await expect(page.locator(".org-tree-member", { hasText: droppedFullName })).toHaveCount(0, {
    timeout: 5000,
  });
});
