import { describe, expect, it } from "vitest";
import { mapStyleFor, type RasterBaseMapSource, type VectorBaseMapSource } from "./base-maps.ts";

describe("mapStyleFor", () => {
  it("wraps a raster source in a minimal single-layer MapLibre style", () => {
    const source: RasterBaseMapSource = {
      type: "raster",
      tiles: ["https://example.com/{z}/{x}/{y}.png"],
      attribution: "© Example",
      maxZoom: 19,
    };

    const style = mapStyleFor(source);

    expect(style).toEqual({
      version: 8,
      sources: {
        basemap: {
          type: "raster",
          tiles: source.tiles,
          tileSize: 256,
          maxzoom: 19,
          attribution: "© Example",
        },
      },
      layers: [{ id: "basemap", type: "raster", source: "basemap" }],
    });
  });

  it("passes a vector source's style URL straight through, unwrapped", () => {
    const source: VectorBaseMapSource = {
      type: "vector",
      styleUrl: "https://tiles.openfreemap.org/styles/liberty",
    };

    expect(mapStyleFor(source)).toBe("https://tiles.openfreemap.org/styles/liberty");
  });
});
