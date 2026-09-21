// Committed static config (TASK.md section 4: "COMMIT the resulting GeoJSON
// polygon and bbox as static config... the runtime must never call OSM").
//
// Looked up once via Nominatim on 2026-09-21 (see docs/WORKLOG.md):
//   GET https://nominatim.openstreetmap.org/search
//     ?q=Meckenhausen,Hilpoltstein,Bavaria,Germany&format=jsonv2&polygon_geojson=1
// Result: a single `place=village` *node* (osm_id 96024074), not a way/relation -
// Meckenhausen (an Ortsteil of Hilpoltstein, Landkreis Roth, Bavaria) has no
// administrative or place-outline polygon in OSM. Per section 4's own fallback
// ("If no polygon exists for the Ortsteil, use a bbox"), this uses Nominatim's
// returned bounding box directly, expressed as a closed GeoJSON rectangle so the
// same point-in-polygon check (point-in-polygon.ts) works whether the boundary is
// ever swapped for a real polygon later.
//
// Nominatim's bbox format is [south, north, west, east]; kept here as the
// individual bounds plus the GeoJSON ring built from them.
export const MECKENHAUSEN_BBOX = {
  south: 49.1518269,
  north: 49.1918269,
  west: 11.2690778,
  east: 11.3090778,
} as const;

// [lng, lat] pairs, GeoJSON winding, first/last point repeated to close the ring.
export const MECKENHAUSEN_BOUNDARY_RING: readonly (readonly [number, number])[] = [
  [MECKENHAUSEN_BBOX.west, MECKENHAUSEN_BBOX.south],
  [MECKENHAUSEN_BBOX.east, MECKENHAUSEN_BBOX.south],
  [MECKENHAUSEN_BBOX.east, MECKENHAUSEN_BBOX.north],
  [MECKENHAUSEN_BBOX.west, MECKENHAUSEN_BBOX.north],
  [MECKENHAUSEN_BBOX.west, MECKENHAUSEN_BBOX.south],
];

export const MECKENHAUSEN_CENTER = { lat: 49.1718269, lng: 11.2890778 } as const;
