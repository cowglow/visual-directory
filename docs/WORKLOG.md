# Work log

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
