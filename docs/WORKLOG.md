# Work log

## 2026-09-21 — New session: TASK.md verification finding (IMPORTANT)

New session starting on `feature/opt-in-signups`, instructed to carry out
`TASK.md` (the Meckenhausen Halloween map pivot) autonomously. TASK.md
section 0 explicitly says to verify the claimed prior-session state with
`git status`, `git diff`, and `pnpm build && pnpm test` rather than trust it
blindly. Doing that first, as instructed:

**The claimed backend-rewrite state does not exist in source.** `git status`
shows only `TASK.md` modified (the task file itself); nothing else is
uncommitted. `backend/prisma/schema.prisma` at HEAD still has the *original*
generic system — `Space` / `SpaceParticipant` (no `role` column) /
`OptInEvent` / `OptInEntry` with a JSON `fieldSchema` — not the
`SpaceLocation`-off-`Space`, `SpaceParticipant.role`, `requireSpaceRole`
design the two worklog entries below and TASK.md section 0 describe. There is
no `seed-space.ts` anywhere in `backend/src` or `backend/prisma`.

Corroborating evidence this work was actually done once and then lost rather
than never attempted: `backend/dist/` (gitignored, local-only build output)
still contains compiled `space-location.repository.js`,
`require-space-role.js`, etc. from **today, 22:21**, matching the design the
worklog entries below describe almost exactly. So a prior session built and
verified this design, but its source changes never made it into the current
`HEAD` (`a4b7f8f "Pre-Session Commit"`, the commit that added `TASK.md` and
these two worklog entries) — reflog/stash show nothing recoverable, so the
source is genuinely gone, not just uncommitted-but-present.

Treating the two worklog entries below as a **useful design reference**
(recovered informally by reading the leftover compiled `dist/*.js`, which is
close enough to read as pseudocode) rather than as ground truth, since the
actual source doesn't exist to inspect directly. Proceeding to actually build
this now, expanding well past that recovered sketch since TASK.md asks for
much more than the original plan covered (GDPR consent, invite expiry/rate
limits, boundary validation, MapLibre map, PWA, dev HTTPS, etc.).

Also noted section 2's "remove leader/member from schema, use-cases, routes,
UI, and tests" — the *directory* app's own `Role` enum (`member`/`leader` on
`Account`) is untouched by this task; that phrasing is the spec's own
shorthand for the Spaces feature's two-role split (`participant`/`visitor`),
which never had `leader`/`member` naming in the code that actually exists.
Nothing to remove there; noting it so it doesn't look skipped.

User sent a mid-task note: the Postgres container is already running; do not
run `docker compose down`/volume/prune commands; only bring up a specific db
service with `docker compose up -d <service>` if unreachable, and log it.
Noted, will follow.

Meckenhausen boundary lookup (section 4, one-time dev-time script, per the
task's own instructions): Nominatim (`nominatim.openstreetmap.org`) is
reachable and returns exactly one result for "Meckenhausen, Hilpoltstein,
Bavaria, Germany" — `osm_type: node` (a point, `place=village`), not a
way/relation, so **no polygon exists for this Ortsteil in OSM**, confirming
the task's own anticipated fallback applies. Overpass
(`overpass-api.de/api/interpreter`) is reachable but returns `406 Not
Acceptable` on every query shape tried (default UA, browser UA, GET/POST) —
logging as a minor blocker, not worth more time on since Nominatim already
answered the only question that mattered (no polygon exists). Using
Nominatim's returned bounding box `[49.1518269, 49.1918269, 11.2690778,
11.3090778]` (south, north, west, east) as the committed boundary, per
section 4's explicit "if no polygon exists, use a bbox and log it."

Plan for the rest of this session, in the order TASK.md specifies: backend
schema/use-cases/validation/security/purge+erase scripts/tests, then
frontend (map, pin placement, forms, invites, delete flow), then PWA/service
worker/IndexedDB, then dev HTTPS, then privacy notice + TEARDOWN.md +
DEV-HTTPS.md. Given the true size of this (a from-scratch self-hosted
MapLibre PWA with offline caching, GDPR-compliant invite system, and
hand-rolled boundary validation on both tiers), logging blockers and moving
on per the task's own instructions where something is genuinely
out-of-reach in this session (no `go-pmtiles`/`pmtiles` CLI installed,
confirmed via `which`, so the tile pipeline is blocked at the "no CLI or
network" case section 4 already anticipates — building against the
placeholder style as instructed).

## 2026-09-21 — Rework Spaces into the Halloween map sign-up

Plan approved (saved separately as the session's plan file): drop the generic
Space/Event/Entry dynamic-field-schema system in favor of a fixed-shape,
invite-only, map-pin-based sign-up (`Space` → `SpaceLocation`, two roles
`location`/`visitor`), matching the reference prototype
`frontend/trick-or-treat-signup.html`. Full rationale in the plan.

Starting with the backend: Prisma schema + migration rewrite (confirmed with
the user that migration `20260915152325_opt_in_spaces` has never been applied
anywhere, so rewriting it in place is safe), then domain/application/ports,
then the frontend, then the manifest.

## 2026-09-21 — Backend rewrite complete

Finished the backend half of the plan: schema/migration rewrite
(`OptInEvent`/`OptInEntry` → `SpaceLocation` directly off `Space`,
`SpaceParticipant.role`), domain types, `space.use-cases.ts` (invite-only
`requestSpaceMagicLink` matching `auth.use-cases.ts`'s anti-enumeration
behavior, new `inviteSpaceParticipant`/`addLocation`/`updateLocation`/
`deleteLocation`), repository interfaces + Prisma implementations, the new
`requireSpaceRole` middleware, rewritten validation schemas and routes, and
`backend/prisma/seed-space.ts` (+ `pnpm seed:space`) replacing the public
self-serve "create a space" page as the bootstrap path.

Gated `POST/PATCH/DELETE /:slug/locations*` behind `requireSpaceRole("location")`
in addition to `requireSpaceAuth` — the plan had left this open ("re-check...
if this reads wrong once built"), but the user was explicit that visitors get
read-only access, so a `visitor`-role session must not be able to write a pin
at the API level (the frontend hiding the button isn't the security boundary,
per this repo's own convention).

Ran `pnpm prisma:generate` (client was stale against the rewritten schema —
that's what the first `pnpm build` errors were), then `pnpm build` (clean) and
`pnpm test` (4 passed — pre-existing `canonical-json.test.ts` only, no new
tests added yet for the invite-only/ownership logic, still pending).

Blocked: `backend/.env.example` and root `.env.example` are outside my
permitted file access this session, so `SEED_SPACE_SLUG`/`SEED_SPACE_NAME`/
`SEED_LOCATION_EMAIL` aren't documented there yet — needs a manual add.

Next: frontend — delete the dynamic-field-era pages, add the locations cache
and map-picker components, then the PWA manifest.
