import type { StyleSpecification } from "maplibre-gl";

// Raster XYZ tile sources. MapLibre does not expand Leaflet's `{s}` subdomain or
// `{r}` retina placeholders, so subdomains are listed explicitly and every URL is
// the plain (non-retina) variant.
export interface RasterBaseMapSource {
  type: "raster";
  tiles: string[];
  attribution: string;
  maxZoom: number;
}

// A full MapLibre vector style, hosted by the provider — glyphs/sprite/vector
// source are all referenced from within `styleUrl` itself, unlike the raster case
// where this app builds the wrapper style locally (see `mapStyleFor` below).
export interface VectorBaseMapSource {
  type: "vector";
  styleUrl: string;
}

export type BaseMapSource = RasterBaseMapSource | VectorBaseMapSource;

const OSM = "© OpenStreetMap contributors";

// Keys are persisted verbatim to localStorage (see tile-server.provider.tsx), so
// keep them stable across changes.
export const baseMaps = {
  // Free, keyless, no rate limit tied to an API key — unlike MapTiler/Stadia's own
  // vector styles, which need one for production domains. See
  // https://openfreemap.org for the terms (short version: free forever, no signup).
  OpenFreeMap: {
    type: "vector",
    styleUrl: "https://tiles.openfreemap.org/styles/liberty",
  },
  OpenStreetMap: {
    type: "raster",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: OSM,
    maxZoom: 19,
  },
  "HOT OSM": {
    type: "raster",
    tiles: [
      "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      "https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    ],
    attribution: `${OSM}, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France`,
    maxZoom: 19,
  },
  "Open Street Map (Fr)": {
    type: "raster",
    tiles: [
      "https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      "https://b.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    ],
    attribution: OSM,
    maxZoom: 19,
  },
  "Open Street Map (De)": {
    type: "raster",
    tiles: ["https://tile.openstreetmap.de/{z}/{x}/{y}.png"],
    attribution: OSM,
    maxZoom: 19,
  },
  "Open Top Map": {
    type: "raster",
    tiles: [
      "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
      "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
      "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
    ],
    attribution: `${OSM}, SRTM | © OpenTopoMap (CC-BY-SA)`,
    maxZoom: 17,
  },
  "Stadia Maps": {
    type: "raster",
    tiles: ["https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png"],
    attribution: `© Stadia Maps, © OpenMapTiles, ${OSM}`,
    maxZoom: 20,
  },
} satisfies Record<string, BaseMapSource>;

export type BaseMapName = keyof typeof baseMaps;

export const defaultBaseMapName: BaseMapName = "OpenStreetMap";

// The MapLibre style to render for a given basemap choice. A raster source gets a
// minimal wrapper style built locally (the vector-first engine's equivalent of a
// Leaflet `L.tileLayer`); a vector source is just its hosted style URL — MapLibre
// fetches and resolves it (including glyphs/sprite/vector tiles) on its own, since
// `mapStyle` accepts `string | StyleSpecification` directly.
export function mapStyleFor(source: BaseMapSource): StyleSpecification | string {
  if (source.type === "vector") {
    return source.styleUrl;
  }
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: source.tiles,
        tileSize: 256,
        maxzoom: source.maxZoom,
        attribution: source.attribution,
      },
    },
    layers: [{ id: "basemap", type: "raster", source: "basemap" }],
  };
}
