import { describe, expect, test } from "vitest";
import { isInsideMeckenhausenBoundary, isPointInPolygon } from "./point-in-polygon.js";
import { MECKENHAUSEN_BBOX, MECKENHAUSEN_CENTER } from "./meckenhausen-boundary.js";

describe("isPointInPolygon", () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ] as const;

  test("a point in the middle is inside", () => {
    expect(isPointInPolygon([5, 5], square)).toBe(true);
  });

  test("a point well outside is outside", () => {
    expect(isPointInPolygon([50, 50], square)).toBe(false);
    expect(isPointInPolygon([-5, 5], square)).toBe(false);
  });

  test("a concave polygon correctly excludes points in the notch", () => {
    // A "C" shape: outer square with a rectangular bite taken out of the right side.
    const cShape = [
      [0, 0],
      [10, 0],
      [10, 4],
      [4, 4],
      [4, 6],
      [10, 6],
      [10, 10],
      [0, 10],
      [0, 0],
    ] as const;

    expect(isPointInPolygon([8, 5], cShape)).toBe(false); // inside the bite
    expect(isPointInPolygon([2, 5], cShape)).toBe(true); // inside the solid part
  });
});

describe("isInsideMeckenhausenBoundary", () => {
  test("the village center is inside", () => {
    expect(isInsideMeckenhausenBoundary(MECKENHAUSEN_CENTER.lat, MECKENHAUSEN_CENTER.lng)).toBe(true);
  });

  test("a point well outside the bbox is outside", () => {
    expect(isInsideMeckenhausenBoundary(48.1, 10.0)).toBe(false);
  });

  test("just inside each edge of the bbox is inside", () => {
    expect(isInsideMeckenhausenBoundary(MECKENHAUSEN_BBOX.south + 0.0001, MECKENHAUSEN_CENTER.lng)).toBe(true);
    expect(isInsideMeckenhausenBoundary(MECKENHAUSEN_BBOX.north - 0.0001, MECKENHAUSEN_CENTER.lng)).toBe(true);
    expect(isInsideMeckenhausenBoundary(MECKENHAUSEN_CENTER.lat, MECKENHAUSEN_BBOX.west + 0.0001)).toBe(true);
    expect(isInsideMeckenhausenBoundary(MECKENHAUSEN_CENTER.lat, MECKENHAUSEN_BBOX.east - 0.0001)).toBe(true);
  });

  test("just outside each edge of the bbox is outside", () => {
    expect(isInsideMeckenhausenBoundary(MECKENHAUSEN_BBOX.south - 0.01, MECKENHAUSEN_CENTER.lng)).toBe(false);
    expect(isInsideMeckenhausenBoundary(MECKENHAUSEN_BBOX.north + 0.01, MECKENHAUSEN_CENTER.lng)).toBe(false);
    expect(isInsideMeckenhausenBoundary(MECKENHAUSEN_CENTER.lat, MECKENHAUSEN_BBOX.west - 0.01)).toBe(false);
    expect(isInsideMeckenhausenBoundary(MECKENHAUSEN_CENTER.lat, MECKENHAUSEN_BBOX.east + 0.01)).toBe(false);
  });
});
