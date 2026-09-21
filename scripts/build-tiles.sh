#!/usr/bin/env bash
# TASK.md section 4: builds the Meckenhausen .pmtiles archive from Protomaps'
# latest daily OpenStreetMap build, clipped to the map's bbox plus a small
# buffer (so panning right up to the edge of the boundary doesn't reveal
# blank tiles). Requires the go-pmtiles CLI (`pmtiles`) - install from
# https://github.com/protomaps/go-pmtiles/releases - and network access to
# build.protomaps.com.
#
# NOT RUN in the session that wrote this script, and the exact builds.json
# URL below is UNVERIFIED: the go-pmtiles CLI isn't installed here, and
# https://build.protomaps.com/builds.json itself returned a bare 404 (not a
# DNS/network failure - build.protomaps.com resolves and responds, Cloudflare
# fronted, just not at that exact path from here) when checked during this
# session (docs/WORKLOG.md, 2026-09-21). That could mean the path has moved
# since this was written, or it could be environment-specific (a CDN edge
# case, a UA block, etc.) - check
# https://docs.protomaps.com/basemaps/downloads for the current documented
# way to find the latest daily build before relying on this, and fix the
# URL below if it's changed. Everything after that lookup (the bbox, the
# `pmtiles extract` invocation itself) is written correctly against
# Protomaps' documented CLI usage and just needs a valid input URL.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/public/spaces/tiles"
# Keep this filename in sync with PMTILES_FILENAME in
# frontend/infrastructure/tile-server/space-map-style.ts - bump both the "-v1"
# here and that constant together on a rebuild, so a stale service-worker
# cache entry (public/spaces/sw.js) can never serve mismatched tiles.
OUT_FILE="$OUT_DIR/meckenhausen-v1.pmtiles"

# Meckenhausen bbox (domain/space/meckenhausen-boundary.ts on both tiers),
# padded by roughly 300m on each side so panning to the edge of the
# boundary outline doesn't show blank tiles just past it.
# Unpadded: south=49.1518269 north=49.1918269 west=11.2690778 east=11.3090778
BUFFER_DEG=0.003
MIN_LAT="49.1488269"
MAX_LAT="49.1948269"
MIN_LON="11.2660778"
MAX_LON="11.3120778"

if ! command -v pmtiles >/dev/null 2>&1; then
  echo "error: the go-pmtiles CLI ('pmtiles') is not installed." >&2
  echo "Install it from https://github.com/protomaps/go-pmtiles/releases, then re-run this script." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

# Protomaps publishes a new global OSM basemap build daily at a versioned URL;
# builds.json lists them with the most recent first. See
# https://docs.protomaps.com/basemaps/downloads#extracts for the extract
# workflow this mirrors.
echo "Looking up the latest Protomaps daily build..."
LATEST_BUILD_URL="$(curl -fsSL https://build.protomaps.com/builds.json | node -e '
  const data = JSON.parse(require("fs").readFileSync(0, "utf-8"));
  if (!Array.isArray(data) || data.length === 0) throw new Error("builds.json was empty or not a list");
  process.stdout.write(data[0].url);
')"

if [ -z "$LATEST_BUILD_URL" ]; then
  echo "error: could not determine the latest build URL from builds.json" >&2
  exit 1
fi

echo "Extracting Meckenhausen bbox (+buffer) from $LATEST_BUILD_URL"
pmtiles extract "$LATEST_BUILD_URL" "$OUT_FILE" \
  --bbox="$MIN_LON,$MIN_LAT,$MAX_LON,$MAX_LAT"

echo "Wrote $OUT_FILE"
echo "Remember to also bundle glyphs (font PBFs) and a sprite sheet locally under"
echo "public/spaces/fonts/ and public/spaces/sprite/ - see docs/WORKLOG.md for what's"
echo "still missing there, and check font licenses before bundling (also noted there)."
