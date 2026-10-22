import { expect, type Page } from "@playwright/test";

// The Map window is auto-launched on load (App.tsx). react-maplibre renders one
// <canvas class="maplibregl-canvas"> — that's the click target for "click the
// map to add a member," replacing the old .leaflet-container.
export async function mapCanvasBox(page: Page) {
  const canvas = page.locator(".maplibregl-canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 10000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("map canvas has no bounding box");
  return box;
}

export async function clickMap(
  page: Page,
  xRatio: number,
  yRatio: number,
): Promise<void> {
  const box = await mapCanvasBox(page);
  await page.mouse.click(
    box.x + box.width * xRatio,
    box.y + box.height * yRatio,
  );
}

interface AddMemberOptions {
  firstName: string;
  lastName: string;
  xRatio?: number;
  yRatio?: number;
  street?: string;
  number?: string;
  zip?: string;
  city?: string;
}

// Plain click on the map = "add a member here" (MembersMap.tsx); fills and
// saves the form that opens, and waits for it to close.
export async function addMemberViaMap(
  page: Page,
  options: AddMemberOptions,
): Promise<void> {
  const {
    firstName,
    lastName,
    xRatio = 0.5,
    yRatio = 0.5,
    street,
    number,
    zip,
    city,
  } = options;
  await clickMap(page, xRatio, yRatio);
  await expect(page.locator("#member-first-name")).toBeVisible({
    timeout: 5000,
  });
  await page.fill("#member-first-name", firstName);
  await page.fill("#member-last-name", lastName);
  if (street) await page.fill("#member-street", street);
  if (number) await page.fill("#member-number", number);
  if (zip) await page.fill("#member-zip", zip);
  if (city) await page.fill("#member-city", city);
  await page.click('button[type="submit"]:has-text("Save")');
  await expect(page.locator("#member-first-name")).toHaveCount(0, {
    timeout: 5000,
  });
}

// Every screen is a full-screen Panel now (see ports/components/panel/Panel.tsx)
// — there's no floating-window stacking order left to manage, just "which of
// the bottom nav's screens is currently on top." These just tap the matching
// tab; BottomNav.tsx renders one on Map/Organizations/Accounts.
export async function goToMap(page: Page): Promise<void> {
  await page.locator(".bottom-nav-tab", { hasText: "Map" }).click();
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible({ timeout: 5000 });
}

export async function openOrganizationsTree(page: Page): Promise<void> {
  await page.locator(".bottom-nav-tab", { hasText: "Organizations" }).click();
  await expect(page.locator(".org-tree")).toBeVisible({ timeout: 5000 });
}

// Leader-only — the tab itself is `disabled` for a member-role account (see
// BottomNav.tsx), so this only makes sense after confirming leader access.
export async function openAccounts(page: Page): Promise<void> {
  await page.locator(".bottom-nav-tab", { hasText: "Accounts" }).click();
  await expect(page.locator(".panel-title", { hasText: "Manage Accounts" })).toBeVisible({ timeout: 5000 });
}

export async function openMenu(page: Page): Promise<void> {
  await page.locator(".bottom-nav-tab", { hasText: "Menu" }).click();
  await expect(page.locator(".menu-row", { hasText: "Import" })).toBeVisible({ timeout: 5000 });
}

// Menu has no bottom nav of its own (see BottomNav.tsx) — goToMap can't reach
// it from there. Use its own back button instead, which reveals whatever was
// open underneath (the screen Menu was opened from). Scoped to the header
// that actually has the "Menu" title — Organizations/Accounts have their own
// back buttons too, and every opened screen stays mounted (just covered), so
// an unscoped `.panel-header-btn` risks matching more than one of them.
export async function closeMenu(page: Page): Promise<void> {
  await page
    .locator(".panel-header", { has: page.locator(".panel-title", { hasText: "Menu" }) })
    .locator(".panel-header-btn")
    .click();
  await expect(page.locator(".menu-row", { hasText: "Import" })).toHaveCount(0, { timeout: 5000 });
}

// Selects a member by full name in the Organizations tree (a single click — not
// the double-click-an-org-name gesture, which selects everyone in that org).
// Selecting drives the map to center on and auto-open that member's marker
// popup (SelectionCamera + Marker.Member's autoOpen), and shows the single-
// member preview panel used by editSelectedMemberFromPreview/previewField.
export async function selectMemberInTree(
  page: Page,
  fullName: string,
): Promise<void> {
  await openOrganizationsTree(page);

  // A member's own organization (or the Unassigned bucket) may start collapsed
  // — a plain click can't reach content inside a closed <details> at all, since
  // the browser removes it from layout entirely, not just hides it visually.
  const collapsedSummaries = page.locator(
    ".org-tree details:not([open]) > summary",
  );
  while ((await collapsedSummaries.count()) > 0) {
    await collapsedSummaries.first().click();
  }

  await page.locator(".org-tree-member", { hasText: fullName }).click();
  await expect(page.locator(".org-preview-card")).toContainText(fullName, {
    timeout: 5000,
  });
}

// Reads a labeled field's value out of the single-member preview panel (e.g.
// "Coordinates", "Telephone") — the panel is a flat <dl> of dt/dd pairs.
export function previewField(page: Page, label: string) {
  return page.locator(`.org-preview-fields dt:has-text("${label}") + dd`);
}

export async function editSelectedMemberFromPreview(page: Page): Promise<void> {
  await page.locator(".org-preview-card button:has-text('Edit')").click();
  await expect(page.locator("#member-first-name")).toBeVisible({
    timeout: 5000,
  });
}

// Clicks "Move" on the currently-open marker popup, then drags the marker by
// (dx, dy) pixels. The marker being moved is identified directly by the
// "map-marker-moving" class Map.Marker.tsx applies while `moving` is true —
// not by guessing which on-screen marker is closest to the map's center, which
// broke down once enough members shared a small area (an unrelated, larger or
// differently-positioned marker's box could read as "closer" to center than
// the real one) and independently raced SelectionCamera's animated 400ms
// panTo triggered by selecting the member.
export async function moveSelectedMemberMarker(
  page: Page,
  dx: number,
  dy: number,
): Promise<void> {
  // selectMemberInTree leaves the Organizations screen on top — every screen
  // is a full-screen Panel now, so the Map (and the popup SelectionCamera
  // auto-opened on it) isn't visible, or clickable, until we navigate there.
  await goToMap(page);
  await page.locator('.maplibregl-popup button:has-text("Move")').click();

  const marker = page.locator(".map-marker-moving");
  await marker.waitFor({ state: "visible", timeout: 5000 });
  const markerBox = await marker.boundingBox();
  if (!markerBox) throw new Error("could not locate the draggable marker");
  const startX = markerBox.x + markerBox.width / 2;
  const startY = markerBox.y + markerBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 10 });
  await page.mouse.up();
}
