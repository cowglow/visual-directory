// The Spaces map's own self-hosted style - deliberately separate from
// infrastructure/tile-server/base-maps.ts, which hits external OSM/Stadia tile
// CDNs at runtime (fine for the directory's internal map, forbidden here:
// TASK.md section 3, "NO third-party requests at runtime: self-hosted tiles,
// fonts, sprites, scripts; no CDNs").
import { addProtocol, type LayerSpecification, type StyleSpecification } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { MECKENHAUSEN_BOUNDARY_RING, MECKENHAUSEN_CENTER } from "domain/space/meckenhausen-boundary.ts";

// Registers the `pmtiles://` URL protocol with MapLibre so a style can
// reference a local .pmtiles archive as a vector source without a tile
// server - idempotent, safe to call more than once (e.g. from both the map
// component and a test). TASK.md section 4: "register the pmtiles protocol."
let protocolRegistered = false;
export function registerPmtilesProtocol(): void {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  addProtocol("pmtiles", protocol.tile);
  protocolRegistered = true;
}

// Versioned filename (TASK.md section 4: "producing one static .pmtiles file
// with a versioned filename") - bump this alongside scripts/build-tiles.sh
// whenever the archive is rebuilt, so a stale service-worker cache entry
// (infrastructure/service-worker/) can never serve mismatched tiles.
export const PMTILES_FILENAME = "meckenhausen-v1.pmtiles";
export const PMTILES_URL = `${import.meta.env.BASE_URL}spaces/tiles/${PMTILES_FILENAME}`;

const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

// TASK.md section 4: "If the CLI or network is unavailable, log it as a
// blocker and continue against a placeholder style (boundary outline on a
// plain background)." That's the situation this session is actually in (see
// docs/WORKLOG.md - no go-pmtiles CLI, no network to build.protomaps.com) -
// this is real, working, and self-hosted (a GeoJSON source built from the
// committed boundary constant, no network requests at all), not a stub.
export function placeholderStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      boundary: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [MECKENHAUSEN_BOUNDARY_RING.map(([lng, lat]) => [lng, lat])] },
        },
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#eef1ea" } },
      {
        id: "boundary-fill",
        type: "fill",
        source: "boundary",
        paint: { "fill-color": "#d8e4d0", "fill-opacity": 0.6 },
      },
      {
        id: "boundary-outline",
        type: "line",
        source: "boundary",
        paint: { "line-color": "#4a6741", "line-width": 2, "line-dasharray": [2, 2] },
      },
    ],
    // No `glyphs`/`sprite` entries - this style has no symbol/label layers, so
    // there's nothing for MapLibre to fetch for them (leaving them out is what
    // keeps this a genuinely zero-request style, not just an unused config
    // pointing at local paths that happen to 404).
  };
}

// The real style, once scripts/build-tiles.sh has produced a `.pmtiles` file
// (TASK.md: "I will supply the file later") and the glyph/sprite assets below
// are bundled under public/spaces/ - see docs/WORKLOG.md for exactly what's
// still missing. `layers()`/`namedFlavor()` come from @protomaps/basemaps
// (the official, MIT-licensed layer-style generator matching Protomaps'
// "basemaps" vector schema - not a runtime CDN dependency, just style JSON
// generation), so this repo never hand-rolls paint rules for ~90 layers.
export function pmtilesStyle(lang: "en" | "de"): StyleSpecification {
  return {
    version: 8,
    // Bundled locally (TASK.md: "Glyphs (font PBFs) and sprites must be
    // bundled locally"). Not yet present in this checkout - see the blocker
    // noted in docs/WORKLOG.md; MapLibre will 404 on label/icon layers until
    // they're added under these paths, but every non-label layer (roads,
    // buildings, water, landuse) still renders.
    glyphs: `${import.meta.env.BASE_URL}spaces/fonts/{fontstack}/{range}.pbf`,
    sprite: `${import.meta.env.BASE_URL}spaces/sprite/sprite`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${PMTILES_URL}`,
        attribution: `${OSM_ATTRIBUTION}, © Protomaps`,
      },
    },
    // @protomaps/basemaps pins its own (older) @maplibre/maplibre-gl-style-spec
    // internally, which this repo's maplibre-gl@6.9.0 doesn't structurally
    // match at the type level even though the runtime JSON shape is fine (it's
    // the same MapLibre style spec both packages target) - a version-skew type
    // cast, not a real type hole; see docs/WORKLOG.md.
    layers: layers("protomaps", namedFlavor("light"), { lang }) as unknown as LayerSpecification[],
  };
}

export { MECKENHAUSEN_CENTER };
