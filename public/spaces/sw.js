// Hand-rolled service worker for the Spaces app (TASK.md section 6: "Prefer
// vite-plugin-pwa (Workbox) if it fits the build, otherwise hand-roll" - it
// doesn't fit cleanly here: this repo's single Vite build has two HTML
// entries (the directory app and this one, vite.config.ts), and
// vite-plugin-pwa's default HTML-injection/precache-manifest generation
// targets one app per build. Rather than fight that (and risk the directory
// app, which is already deployed and unrelated to this feature, picking up a
// service worker it never asked for), this is a small, explicit,
// hand-written worker scoped only to /visual-directory/spaces/ - see
// docs/WORKLOG.md for the full reasoning.
//
// Strategy: runtime cache-first for everything in scope, built up from actual
// use rather than a precomputed manifest. That's enough to satisfy the
// concrete requirement ("after the first visit the map must render with zero
// tile requests to the network") without needing to know this build's hashed
// asset filenames, which a static file in public/ can't - those are only
// known after `vite build` runs.
//
// Bump this on any change to the caching *strategy* below (not on every app
// deploy - that would defeat the whole point of caching). It's what makes
// `activate` drop a stale cache instead of accumulating old strategies
// forever.
const CACHE_VERSION = "spaces-v1";

const SCOPE_PATH = "/visual-directory/spaces/";
const TILES_PATH = "/visual-directory/spaces/tiles/";

self.addEventListener("install", () => {
  // See the update-handling note below - this makes a newly-fetched worker
  // active immediately rather than waiting for every open tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

// TASK.md section 6: "make sure Range requests are answered from cache" for
// the .pmtiles archive (which pmtiles' Protocol fetches in byte-range chunks,
// not as one request - see infrastructure/tile-server/space-map-style.ts).
// The trick: cache the *whole* file once, ignoring any Range header on the
// way in, then answer every subsequent ranged request by slicing that cached
// full response in memory - so the archive is downloaded from the network
// at most once, and every tile after that is served from disk, byte-range
// intact.
async function handleRangeableRequest(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cacheKey = new Request(request.url); // strips the Range header for the cache key
  let full = await cache.match(cacheKey);

  if (!full) {
    const response = await fetch(cacheKey); // unranged - the complete file
    if (!response.ok) return response;
    await cache.put(cacheKey, response.clone());
    full = response;
  }

  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) return full;

  const buffer = await full.clone().arrayBuffer();
  const match = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);
  if (!match) return full;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : buffer.byteLength - 1;
  const slice = buffer.slice(start, end + 1);

  const headers = new Headers(full.headers);
  headers.set("Content-Range", `bytes ${start}-${end}/${buffer.byteLength}`);
  headers.set("Content-Length", String(slice.byteLength));
  return new Response(slice, { status: 206, statusText: "Partial Content", headers });
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only ever cache GET requests same-origin and within this app's own
  // scope - every write (POST/PATCH/DELETE) and every request to the API's
  // own origin (a different origin from this static site - see
  // ports/http/app.ts's CORS comment) passes straight through untouched.
  // That includes the magic-link/invite-accept calls themselves (TASK.md:
  // "Magic-link callback routes are network-only and never cached") - they
  // hit the API origin, which this check already excludes.
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)) {
    return;
  }

  if (url.pathname.startsWith(TILES_PATH)) {
    event.respondWith(handleRangeableRequest(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
