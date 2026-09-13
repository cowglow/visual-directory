# Project Plan: Visual Directory

This document is the working plan that took this map prototype from scratch into a
real tool: a visual directory where leadership can create members, assign them to
organizations, and see where everyone lives on a map. It covers three things that
happened together: the "Clear Architecture" migration, the actual member/organization
features, and a real backend with accounts and an audit trail.

**Status: Phases 0–5 below are complete.** The codebase has since moved past what
this plan originally scoped in a few ways worth knowing before reading the phases as
if they were still upcoming:

- The map runs on MapLibre GL, not Leaflet (the migration this plan doesn't mention at
  all, since it happened after this document was written).
- Phase 5's "map-first" framing became a full desktop-window UI: the map and the
  Organizations tree are independent, draggable/resizable `DesktopWindow`s with
  z-order cycling, not just one map window.
- Two features exist beyond this plan's scope: quick-pinning an "incomplete" member
  (Shift+click, fill in details later) and two-way selection binding between the
  Organizations tree and the map markers.
- Phase 2's distance feature (`application/geo/distance.ts`, a "pick an origin, see
  everyone sorted by distance" panel) was removed from the UI during the MapLibre
  migration and never rebuilt — the underlying haversine helper is still in the tree
  but nothing calls it. Revisit or delete; it's not currently a working feature.
- `backend/prisma/demo-seed.ts` (`pnpm seed:demo`) exists for seeding a curated
  demo/onboarding roster, on top of the original single-leader `pnpm seed`.

See `docs/CLEAR_ARCHITECTURE_TS.md` for the architectural style adopted (Joschi
Kuphal's [Clear Architecture](https://github.com/jkphl/clear-architecture/blob/master/README.md),
adapted for this repo), and `CLAUDE.md` for a snapshot of the current codebase.

## Vision

- Leaders create **members** and assign them to **organizations** (Region → Headquarter
  → Area → District, per `domain/shared/types.ts`).
- Each member has an address, which is geocoded to a `GeoCoordinate` and rendered as a
  map marker.
- From any member (or your own location), you can see the distance to every other
  member — either as a sorted list or as radius rings on the map.
- Members carry a signup date and an active/lost-contact status: a member is `active`
  by default; a leader can explicitly mark someone as having lost contact, which stamps
  the date they were last known to be active.
- This starts as a leadership-only tool, is gradually opened up to technically
  comfortable members, and may never be used directly by less technical/older members —
  the UI needs to stay simple enough that this isn't a blocker.

## Decisions made and why

These came out of discussion and are recorded here so they don't get re-litigated:

- **Accounts**: every member can eventually have a login, but roles gate what they can
  do — `member` = read-only, `leader` = read + write. Not everyone needs to log in on
  day one; leaders first.
- **Visibility**: any logged-in member sees the full directory (address + contact info),
  not a redacted view. The access boundary is *editing*, not *viewing* — this is a
  trust-based tool for one organization, not a multi-tenant product.
- **Lost contact**: manual only. A leader explicitly flags a member as lost contact,
  which stamps the last-known-active date. No automatic inactivity timer for now.
- **Distance feature**: select a member (or use your own location) and see distance to
  everyone else. Not a full pairwise matrix — not enough value for the added UI/compute
  cost at this roster size.
- **Persistence**: a small hand-written REST API in front of a self-managed Postgres
  instance. Explicitly **not** Hasura — Hasura's value is auto-generated CRUD via
  GraphQL (REST is a thin wrapper over that), but the audit log below needs to be
  hand-written and atomic with each write anyway, so a plain REST handler gives more
  direct control for about the same effort.
- **Audit trail**: an application-level, append-only, hash-chained change log (each
  entry stores `hash = sha256(prevHash + canonical(entry))`), not a real blockchain —
  there's one trusted server, so consensus machinery would be pure overhead. This gives
  tamper-evidence and full who/when/what history without needing to reinvent Postgres
  as an event store.
- **Auth mechanism**: magic-link email login (click a link, no password). Chosen over
  passkeys for now because it's simpler to explain to less technical/older members and
  doesn't depend on device biometric support; doesn't require Keycloak or any IdP.
- **Hosting**: Hetzner (Bavaria-headquartered, EU datacenters), self-managed Postgres —
  not Azure/AWS (data sovereignty preference), not a managed Postgres SaaS (keeps
  infra to one VPS you fully control).
- **Dev/deploy shape**: the frontend stays a static site (unchanged Vite dev server via
  `pnpm dev`, unchanged GitHub Pages deploy via `.github/workflows/deploy.yml`) and only
  ever talks to the backend over its REST API (via a configurable base URL) — never to
  Postgres directly. The backend (API + Postgres) is containerized via `docker-compose`
  for local/Hetzner parity. This preserves the current separation between the static
  client and the data layer.

## Original baseline (historical — this plan started from here)

This section describes the prototype this plan started from, before any of the
phases below ran. It's kept for context on *why* Phase 0 exists, not as a
description of the current tree — see the Status note above for what actually
shipped, and `CLAUDE.md` for the current architecture.

- The Clear Architecture migration was just starting: `domain/`, `application/`,
  `infrastructure/`, `ports/` were the live tree; `components/`, `context/`, `hooks/`,
  `redux-store/`, `utils/`, `db/`, `feature/`, `types/` were dead leftovers from before
  the migration.
- `domain/member` and `domain/organization` had real types and factories but weren't
  wired to anything — `member.slice.ts`/`organization.slice.ts` were legacy-style stub
  reducers, and `MemberForm`/`OrganizationForm` were placeholder components.
- The map only ever rendered anonymous `GeoCoordinate` pins added by clicking the map
  — there was no concept of a Member marker yet.
- File → Open/Save round-tripped those anonymous pins as CSV, not member/organization
  records.
- There was dead MongoDB stub code and matching `docker-compose.yml` services left
  over from an abandoned idea, never wired to anything real.
- The "Edit" menu meant "enable/disable click-to-add-marker," a workaround for map
  clicks bubbling through floating controls, not a real feature.
- `pnpm build` and `pnpm lint` were both broken.

## Phase 0 — Stabilize

Prerequisite hygiene before building new features on top of a broken/duplicated tree.

- Fix `pnpm build` (missing `MapLayerGroupProps` export from `ports/components/map/map.types.ts`).
- Fix `pnpm lint`: point it at `src` instead of the stale `map-sector-creator` path, and
  migrate `.eslintrc.cjs` to a flat `eslint.config.js` (required by the installed
  ESLint v9).
- Finish the Clear Architecture migration: delete the dead legacy trees (`components/`,
  `context/`, `hooks/`, `redux-store/`, `utils/`, `db/`, `feature/`, `types/`) now that
  the new tree fully supersedes them. Move `src/config/` (still referenced from
  `ports/` for `menu.config.ts` / `dialog.config.tsx`) into the new tree, e.g.
  `ports/config/`. Drop the unused near-duplicates (`createMenuConfig.ts`,
  `dialog-config.tsx`).
- Delete the dead MongoDB stub (`infrastructure/persistence/db.*`) — superseded by the
  Postgres plan in Phase 3.

## Phase 1 — Fix the interaction model

- Stop menu/control clicks from bubbling into the map's click-to-add-marker handler
  (`event.stopPropagation()` on the floating control panel, not a global on/off
  toggle). Keep the current floating-panel-inside-the-map layout.
- Once propagation is fixed, retire the "Enable/Disable Markers" Edit menu items —
  they were a workaround for the bug, not a real feature.
- Re-scope the "Edit" and "Actions" menus around real actions once the member/org data
  model lands in Phase 2 (e.g. "Add Member", "Add Organization", "Mark Lost Contact").

## Phase 2 — Member & Organization features (the actual directory)

- Extend `domain/member/member.types.ts` with a signup date and a status field, e.g.:
  ```ts
  type MemberStatus =
    | { kind: "active" }
    | { kind: "lost-contact"; lastActiveDate: string };
  ```
  (`active` needs no date; a date only appears once contact is lost — matching the
  original idea of "active" vs. a lost-contact timestamp.)
- Turn `infrastructure/redux/member/member.slice.ts` and
  `.../organization/organization.slice.ts` into real Redux Toolkit slices, combined
  into the root reducer in `infrastructure/redux/store.ts`.
- Build out `MemberForm`/`OrganizationForm` (currently placeholders) to actually create
  and edit members, assign them to organizations, and capture/geocode an address into
  a `GeoCoordinate`.
- Change map rendering so markers represent **members** (via their address) rather than
  anonymous clicked points. Decide what happens to free-form pin-dropping — most likely
  it becomes "create a member at this location" rather than a separate concept.
- Add the distance feature: select a member or use `use-geo-location.ts`, compute
  distance to every other member (add a haversine helper alongside the existing
  `application/geo/bearing.ts`), and show it as a sorted list and/or radius rings.
- Evolve File → Open/Save from raw marker CSV to member/organization data — useful as
  an import/export/offline mechanism even after the backend exists (Phase 3), not just
  an interim measure.

## Phase 3 — Backend: Postgres + REST API on Hetzner

- Schema: `members`, `organizations`, membership/assignment, `accounts` (login
  identities + role), `audit_log` (hash-chained).
- REST API (Node/Express or similar) with CRUD endpoints for members/organizations,
  enforcing `member` (read-only) vs `leader` (read/write) roles from the session.
- Every write appends an audit log entry: `{ timestamp, actorAccountId, entity,
  entityId, diff, prevHash, hash }`, where `hash = sha256(prevHash + canonicalJson(rest
  of entry))` — computed and stored atomically with the underlying write.
- Magic-link email auth: passwordless login, leader-issued invites to start (no open
  self-registration initially).
- Local dev parity: add `api` and `db` (Postgres) services to `docker-compose.yml`,
  replacing the stale `mongodb`/`mongo-express` services (an `adminer` service is a
  reasonable stand-in for `mongo-express`). The frontend keeps running via plain
  `pnpm dev` (not containerized) and points at the API via an env var
  (`VITE_API_URL` or similar) — `http://localhost:<port>` locally, the real Hetzner
  domain in production.
- Deployment: frontend deploy is unchanged (`.github/workflows/deploy.yml` → GitHub
  Pages). Backend deploy to the Hetzner VPS starts manual (`docker compose up` on the
  box); CI/CD for the backend is explicitly out of scope until the API itself exists.

## Phase 4 — Rollout

- Leaders get accounts first: they do the data entry, edits, and lost-contact flagging.
- Technical members introduced next, read-only by default.
- General/older members are not a requirement to onboard directly — the UI (OS-menu
  affordance, now a desktop-window metaphor per Phase 5) should stay simple enough
  that they *could*, but adoption isn't forced.

## Phase 5 — Desktop window UI

Supersedes the "map-first" framing implicit above: instead of the map filling the
whole content area, the System.css chrome (`.window`/`.title-bar`, already used for
`MainLayout` and every dialog) becomes a real desktop — the map is a draggable window
launched on top of it, like an app, and other views (the org/member phone-book list,
today's single-instance modal dialogs) become windows of their own later. Staged so
each step ships independently:

- **5a (current)** — Build a generic draggable window component (drag via the
  title-bar using pointer events; System.css supplies the chrome but no JS behavior of
  its own). Convert the map from a full-bleed child of `MainLayout` into the first
  instance of this window, auto-launched on load. Existing modal dialogs
  (`DialogWindow`, `Dialogs.tsx`) are untouched in this step.
- **5b (later)** — Turn `OrganizationTree` (today's "View → Organizations" modal,
  already a phone-book-style list nested under org titles) into a non-modal draggable
  window, and generalize `app-dialog.context.tsx` from a single `dialog: DialogType |
  null` into a window stack so more than one window can be open at once (list + map
  simultaneously, z-index bring-to-front on focus).
- **5c (later)** — Rework the "File/Actions/View" menu bar (`menu.config.ts`,
  `ActionMenu.tsx`) around the desktop metaphor — launching/reopening/focusing windows
  rather than opening a single modal.

## Explicitly deferred (not blocking, revisit later)

- Automatic inactivity-based lost-contact detection (vs. the manual flagging above).
- Per-field or per-member visibility controls (vs. today's all-or-nothing by role).
- Members editing their own record.
- A full pairwise distance matrix.
- Passkey login (viable alternative to magic-link, revisit if magic-link email proves
  friction-prone).
- Ingesting/syncing membership data from Asana, which is expected to become the
  real system of record — this Postgres database would then hold a derived copy
  rather than the only copy. Not scoped yet; see `docs/PRIVACY.md`'s retention
  section for how this affects the current no-backup tradeoff.