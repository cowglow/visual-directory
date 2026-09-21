// Mirrors backend/src/domain/space/meckenhausen-boundary.ts - see that file for
// the full provenance comment (looked up once via Nominatim, no OSM polygon
// exists for this Ortsteil, so this is Nominatim's returned bbox as a closed
// GeoJSON rectangle). Committed static config (TASK.md section 4) - the
// runtime never calls OSM, on either tier.

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

// MapLibre's maxBounds, flat [west, south, east, north] form (the form this
// repo's @vis.gl/react-maplibre version's types require - see
// SpaceMap.tsx).
export const MECKENHAUSEN_MAX_BOUNDS: [number, number, number, number] = [
  MECKENHAUSEN_BBOX.west,
  MECKENHAUSEN_BBOX.south,
  MECKENHAUSEN_BBOX.east,
  MECKENHAUSEN_BBOX.north,
];
