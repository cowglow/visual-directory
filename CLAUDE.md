# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A map-based contact directory for leadership organizations: leaders add members by
clicking their location on the map, assign them to organizations, and mark lost
contact. Full product context is in `docs/PLAN.md`; this repo's architectural style is
Joschi Kuphal's [Clear Architecture](https://github.com/jkphl/clear-architecture/blob/master/README.md),
as adapted for both `frontend/` and `backend/` in `docs/CLEAR_ARCHITECTURE_TS.md` (the
upstream doc's own conventions — `UpperCamelCase` directories, a separate `Tests`
tier — were never adopted here; that companion doc is the accurate reference).

Two independently deployable pieces:

- **`frontend/`** — React + TypeScript + Vite frontend, built as a static site and
  deployed to GitHub Pages (`gh-pages` branch) on every push to `main`. Talks to the
  backend only through its REST API, at whatever `VITE_API_URL` was baked in at build
  time — never touches Postgres directly.
- **`backend/`** — Node/Express + Prisma + Postgres backend, not a workspace member of
  the frontend (separate `package.json`/`pnpm-lock.yaml`). Runs as `db` + `api` +
  `caddy` on a Hetzner VPS via `docker-compose.prod.yml`; the `deploy_server` job in
  `.github/workflows/deploy.yml` builds the image, deploys, and runs
  `prisma migrate deploy` on every push to `main`. Setup: `docs/HETZNER_DEPLOY.md`;
  rebuilding after a teardown: `docs/HETZNER_REBUILD.md`.

## Commands

Frontend (repo root):

```bash
pnpm dev                              # vite dev server on :3000
pnpm dev:up                           # backend up + dev server, one terminal
pnpm dev:ai                           # launch claude code agent
pnpm build                            # tsc && vite build
pnpm lint                             # eslint frontend e2e --max-warnings 0
pnpm test                             # vitest --coverage
pnpm test -- path/to/file.test.ts     # run a single unit test file
pnpm test:e2e                         # playwright test (requires backend running, see e2e/README.md)
pnpm format                           # prettier . --write
pnpm storybook                        # storybook dev on :6006
```

Backend (`backend/`):

```bash
cd backend
pnpm dev              # tsx watch src/index.ts
pnpm build            # tsc
pnpm test             # vitest run
pnpm test -- path/to/file.test.ts
pnpm prisma:migrate   # create a new dev migration
pnpm prisma:deploy    # apply existing migrations
pnpm seed             # SEED_LEADER_EMAIL=you@example.com pnpm seed — bootstrap first leader
```

Backend via Docker, from repo root (needed for e2e tests and full-stack dev — see
README for one-time `.env` setup):

```bash
pnpm backend:up        # docker compose up -d db api adminer
pnpm backend:up:local  # same, but forces RESEND_API_KEY/EMAIL_FROM empty — use this for local
                       # dev/testing so magic-link requests always return a devToken instead of
                       # trying real Resend delivery, which the root .env's key can only send
                       # to its own account owner's address (see docs/RESEND_EMAIL_SETUP.md)
pnpm backend:migrate   # apply migrations inside the api container
pnpm backend:seed      # SEED_LEADER_EMAIL=... pnpm backend:seed
pnpm backend:logs
pnpm backend:down
```

Unit tests only cover `*.test.ts` files (not `.tsx`) on both sides — see
`vitest.config.ts` / `backend/vitest.config.ts`. E2E tests (`e2e/*.spec.ts`) run against
a real frontend + real backend + real Postgres, single-worker (not parallel — several
specs share the one seeded leader account), see `e2e/README.md`.

## Architecture (frontend)

`frontend/` follows the **Clear Architecture** pattern (`docs/CLEAR_ARCHITECTURE_TS.md`):
a dependency rule where each layer may only depend on itself or layers inward of it.

- **`domain/`** — business types and factories, no framework dependencies. `member/`,
  `organization/`, `marker/` (the `GeoCoordinate` type), `shared/` (cross-domain types
  like the `Region → Headquarter → Area → District` organization hierarchy).
- **`application/`** — use-case logic built on domain types: `csv/` (roster
  import/export), `geojson/` (roster → GeoJSON `FeatureCollection`, export only),
  `geo/` (bearing, bounding-box; `distance.ts`'s haversine helper is currently unused —
  the "distance to other members" panel it backed was removed during the MapLibre
  migration and never rebuilt).
- **`infrastructure/`** — framework/3rd-party bindings: `redux/` (Redux Toolkit slices
  + selectors + a `<domain>.saga.ts` per domain, wired together in `store.ts` and
  `sagas.ts` — see `docs/CLEAR_ARCHITECTURE_TS.md` for the request/response action
  pattern this follows), `api/` (REST client for the backend), `csv/`, `tile-server/`
  (raster and vector basemap sources + `mapStyleFor()`, which returns the MapLibre
  style the map renders — a locally-built wrapper style for a raster source, or the
  provider's own hosted style URL passed straight through for a vector one (e.g.
  `OpenFreeMap`) — `TileServerContext`'s `setSelectedBaseMap` is wired to a Map menu →
  Basemap submenu in `ActionMenu.tsx`/`menu.config.ts`, listing every key of
  `baseMaps` and persisting the choice to `localStorage`), `geo-simulation/`.
- **`ports/`** — the public/UI surface: `components/` (React components, grouped by
  feature area — `map/`, `markers/`, `forms/`, `dialogs/`, `auth/`, etc.),
  `context/` (React context providers: dialogs, i18n, tile server config), `hooks/`,
  `i18n/`, `config/`, `testing/` (Storybook fixtures).

Imports are absolute from `frontend/` (e.g. `ports/components/map/MembersMap.tsx`, not
a relative path) — enabled via `baseUrl: "./frontend"` in `tsconfig.json` and the
`vite-tsconfig-paths` plugin, not a bundler alias to reproduce elsewhere.

Role gating (`member` = read-only, `leader` = read/write) is enforced both in the UI
(`infrastructure/redux/auth/auth.selectors.ts`'s `isLeader`, gating things like
click-to-add-member on the map in `App.tsx`) and, authoritatively, on the backend — the
frontend check is a UX convenience, not the security boundary.

## Architecture (backend)

`backend/src/` follows the same Clear Architecture pattern as the frontend — see
`docs/CLEAR_ARCHITECTURE_TS.md`'s "How the backend applies this" section for the full
rationale. `prisma/schema.prisma` is the source of truth for the data model
(`Account`, `Member`, `Organization`, `MagicLinkToken`, `AuditLogEntry`), accessed
only from `infrastructure/prisma/`. In brief:

- **`domain/`** — `member/`, `organization/`, `account/` types; `shared/types.ts`
  (`Role`/`OrganizationType`/`DepartmentType`, kept independent of `@prisma/client`);
  `audit/` (`canonicalJson`, `computeAuditHash` — the pure
  `hash = sha256(prevHash + canonicalJson(entry))` rule); `auth/magic-link.ts`
  (`TOKEN_TTL_MS`, `hashToken`, `isTokenUsable`).
- **`application/`** — a `*.repository.ts` interface per aggregate
  (`MemberRepository`, `OrganizationRepository`, `AccountRepository`,
  `MagicLinkTokenRepository`), plus `mailer.ts`/`token-signer.ts`/`token-generator.ts`
  interfaces. `auth/auth.use-cases.ts` holds the real cross-repository orchestration
  (`requestMagicLink`, `verifyMagicLink`, `inviteAccount`); member/organization CRUD
  has no separate use-case layer since each operation is fully captured by its
  repository interface already.
- **`infrastructure/prisma/`** — one repository implementation per interface
  (`member.repository.ts`, etc.), each owning the Prisma-columns ↔ domain-shape
  mapping and wrapping its own writes in `prisma.$transaction` together with
  `appendAuditLog` (also here) so a write and its audit entry commit atomically.
  `infrastructure/mail/get-mailer.ts` picks `consoleMailer` or the real Resend-backed
  `resendMailer` based on whether `RESEND_API_KEY`/`EMAIL_FROM` are set — independent
  of `NODE_ENV`, so local dev needs no real email account and a production box with
  those unset still works, just without real email delivery (see
  `docs/RESEND_EMAIL_SETUP.md`). `infrastructure/auth/` has the JWT signer and the
  random token generator.
- **`ports/http/`** — `routes/*.routes.ts` are dependency-injected factories
  (`createMemberRouter(deps)`) mounted by `app.ts`; `middleware/require-auth.ts` is
  the same (`createRequireAuth(tokenSigner)`, populating `req.account` from the
  bearer token), `middleware/require-role.ts` gates by role, and
  `middleware/error-handler.ts` + `lib/async-handler.ts` route thrown/rejected errors
  to one place instead of needing try/catch in every handler.
- **`composition-root.ts`** — the one place concrete infrastructure gets built and
  wired into `application`/`ports`; `index.ts` just calls it and listens.

This is tamper-evidence for a single trusted server, not a distributed-consensus
mechanism — don't over-engineer around the hash chain. Changing `computeAuditHash`'s
output format breaks verification of every prior chain entry.

Visibility vs. edit access is intentionally asymmetric: any logged-in account (member
or leader) can read the full directory (address + contact info) — there's no redacted
view. The access boundary is *write*, not *read*. This is a trust-based tool for one
organization, not a multi-tenant product — don't add per-field visibility controls
without checking `docs/PLAN.md`'s "explicitly deferred" list first.