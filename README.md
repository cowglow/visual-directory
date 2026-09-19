[![Publish Site](https://github.com/cowglow/visual-directory/actions/workflows/deploy.yml/badge.svg)](https://github.com/cowglow/visual-directory/actions/workflows/deploy.yml)
[![Tests](https://github.com/cowglow/visual-directory/actions/workflows/test.yml/badge.svg)](https://github.com/cowglow/visual-directory/actions/workflows/test.yml)
[![Hetzner Deploy](https://cowglow.github.io/visual-directory/status-badge.svg)](https://api.cowglow.io/health)

# Visual Directory

A map-based contact directory for leadership organizations: leaders add members by
clicking their location on the map and assign them to organizations. See
`docs/PLAN.md` for the full product plan and `docs/USER_MANUAL.md` for how to
actually use the app.

![Visual Directory screenshot](docs/images/app-screenshot.png)

## Repo layout

- **`frontend/`** — the frontend: React + TypeScript + Vite, deployed as a static
  site to GitHub Pages. Talks to the backend only over its REST API. Follows the
  **Clear Architecture** pattern — see `docs/CLEAR_ARCHITECTURE_TS.md`.
- **`backend/`** — the backend: Node/Express + Prisma + Postgres, also following
  Clear Architecture. A separate, independently deployable service — not a workspace
  member of the frontend.
- **`e2e/`** — Playwright end-to-end tests driving the real frontend against the real
  backend. See `e2e/README.md`. Every push to `main` runs the frontend/backend unit
  tests and this e2e suite via `.github/workflows/test.yml` and publishes a combined
  report to [cowglow.github.io/visual-directory/test-report/](https://cowglow.github.io/visual-directory/test-report/).
- **`docs/`** — `PLAN.md` (the product plan), `CLEAR_ARCHITECTURE_TS.md` (the
  architectural style, both sides of the repo), `USER_MANUAL.md`, `HETZNER_DEPLOY.md`
  (production deployment guide), `HETZNER_REBUILD.md` (rebuilding after a teardown),
  `VALIDATE_PRODUCTION.md` (checklist for confirming a production deploy is healthy).

## How the frontend is hosted

The frontend is a static site — there's no Node server involved in production at all.
`vite build` compiles `frontend/` into plain HTML/CSS/JS in `dist/`, and that's served
directly by **GitHub Pages** from the `gh-pages` branch of this repo.

That branch is kept up to date automatically by `.github/workflows/deploy.yml`: every
push to `main` runs `pnpm install && pnpm build`, then
[`JamesIves/github-pages-deploy-action`](https://github.com/JamesIves/github-pages-deploy-action)
force-pushes the contents of `dist/` to `gh-pages`, which is the branch GitHub Pages is
configured to serve from. There's no separate deploy step to run by hand — merging to
`main` is the deploy. The badge at the top of this README links to that workflow's run
history. The third badge, "Hetzner Deploy," is separate and self-hosted — the same
workflow checks `https://api.cowglow.io/health` once per deploy (after the API job
finishes, whether or not it succeeded) and renders an Online/Offline SVG straight into
the published site, so it reflects the backend's actual reachability right after each
deploy rather than just whether the CI steps passed.

Because it's a static export, the frontend never talks to a database directly — it
only calls the backend's REST API, at whatever URL `VITE_API_URL` was set to when it
was built (baked in at build time, since Vite env vars aren't read at runtime). Locally
that's `http://localhost:4000` (see `.env.example`); in the deployed build it points at
wherever the backend is actually deployed (see `docs/HETZNER_DEPLOY.md` step 8).

The backend (`backend/`, Postgres + the API) is **not** part of this static deploy — it
runs separately, containerized, wherever you choose to host it (see
[Running the backend in Docker](#running-the-backend-in-docker-for-development) and
[Deploying the backend](#deploying-the-backend) below).

## Quick start

Frontend only (map UI, no login/backend features will work):

```bash
pnpm install
pnpm dev
```

Full stack, for anything involving login, members, or organizations — one-time setup
(see [Running the backend in Docker](#running-the-backend-in-docker-for-development)
below for what these do), then a single command to boot everything day-to-day:

```bash
cp .env.example .env               # VITE_API_URL should point at the backend
cd backend && cp .env.example .env && cd ..
pnpm backend:up
pnpm backend:migrate
pnpm backend:seed   # first time only - bootstraps SEED_LEADER_EMAIL from .env
                     # (defaults to leader@example.com); override once with
                     # SEED_LEADER_EMAIL=you@example.com pnpm backend:seed

pnpm dev:all               # backend (already up) + frontend dev server + Storybook, one terminal
```

Magic-link logins are sent via [Resend](https://resend.com) when `RESEND_API_KEY`/
`EMAIL_FROM` are set (see `backend/.env.example` and `docs/HETZNER_DEPLOY.md`) —
independent of `NODE_ENV`. Leave them unset (the local/dev default) and links are
logged to the backend's own console instead, so nothing needs a real email account
to test.

## Commands

Frontend (repo root):

```bash
pnpm dev          # start dev server
pnpm dev:all      # backend up + dev server + Storybook together, one terminal (see below)
pnpm build        # tsc && vite build
pnpm lint         # eslint frontend e2e
pnpm test         # vitest --coverage (unit tests)
pnpm test:e2e     # playwright test (requires the backend running — see e2e/README.md)
pnpm format       # prettier . --write
pnpm docker:dev   # open a shell in a containerized frontend dev environment (see below)

pnpm backend:up       # docker compose up -d db api adminer
pnpm backend:down     # docker compose down
pnpm backend:logs     # tail the api container's logs
pnpm backend:migrate  # apply pending Prisma migrations inside the api container
pnpm backend:seed     # bootstrap the first leader account - reads SEED_LEADER_EMAIL from
                      # .env (default leader@example.com); SEED_LEADER_EMAIL=you@example.com
                      # pnpm backend:seed overrides it for one run without editing .env
```

Backend (`backend/`):

```bash
pnpm dev              # tsx watch src/index.ts
pnpm build            # tsc
pnpm prisma:migrate   # create a new migration (dev)
pnpm prisma:deploy    # apply existing migrations
pnpm seed             # bootstrap the first leader account (SEED_LEADER_EMAIL=...)
pnpm test             # vitest run
```

## Docker

There are two independent Docker setups in this repo, defined together in the one
`docker-compose.yml` at the root:

- **`frontend`** — an _optional_, containerized shell for running the Vite dev server
  itself, in case you'd rather not install Node/pnpm on your host at all. Nothing about
  the frontend's actual deploy uses this container (see
  [How the frontend is hosted](#how-the-frontend-is-hosted) above) — it exists purely
  as a convenience for local development.
- **`db` + `api` (+ `adminer`)** — the real backend stack: Postgres, the Express/Prisma
  API, and a database admin UI. This is what actually needs Docker, for local dev and
  for the Hetzner production deploy alike.

Both need Docker Desktop (or another Docker Engine) running locally first.

### Running the backend in Docker (for development)

From the repo root:

```bash
cd backend
cp .env.example .env               # dev defaults are fine locally, edit if you need to
cd ..
pnpm backend:up
```

This builds the `api` image (see `backend/Dockerfile` — a two-stage build that compiles
the TypeScript and runs Prisma's client generation, then a slim production-style image
that just runs `node dist/index.js`) and starts three containers:

| Container                  | Service   | Port                 |
| -------------------------- | --------- | -------------------- |
| `visual-directory-db`      | `db`      | `5432` (Postgres)    |
| `visual-directory-api`     | `api`     | `4000` (REST API)    |
| `visual-directory-adminer` | `adminer` | `8081` (DB admin UI) |

Then run migrations and seed the first leader account (only needed once, or after a
schema change):

```bash
pnpm backend:migrate
pnpm backend:seed   # reads SEED_LEADER_EMAIL from root .env (default leader@example.com);
                    # SEED_LEADER_EMAIL=you@example.com pnpm backend:seed overrides it once
```

Confirm it's up:

```bash
curl http://localhost:4000/health
# {"ok":true}
```

Adminer (a Postgres web UI) is now reachable at `http://localhost:8081` — use
`db` / the `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` values from
`docker-compose.yml` (defaults: `app` / `app` / `contact_book`) to log in.

Now point the frontend at it and start it (on your host, not in Docker — see below for
why):

```bash
cp .env.example .env               # VITE_API_URL=http://localhost:4000 by default
pnpm dev
```

Or, once the one-time setup above is done, `pnpm dev:all` brings the backend up (if
not already) and runs the frontend dev server and Storybook together in one terminal.

Useful day-to-day commands:

```bash
pnpm backend:logs            # tail API logs
pnpm backend:down            # stop everything (keeps the Postgres volume)
docker compose down -v       # stop everything AND wipe the Postgres volume
```

### Running the frontend in Docker (optional)

The frontend normally just runs on your host via `pnpm dev` — that's what
`.github/workflows/deploy.yml` and every doc above assumes, and it's the simpler path.
The `frontend` service exists only if you'd rather do all of that inside a container
(e.g. to avoid installing a specific Node version locally). It's a plain `node:22`
image with the repo bind-mounted in, not a prebuilt dev server — `pnpm install`/
`pnpm dev` get run manually once you're inside it.

```bash
pnpm docker:dev
# equivalent to: docker compose run --service-ports frontend bash
```

That drops you into a shell inside the container, with the repo mounted at `/app`.
From there:

```bash
pnpm install
pnpm dev            # or `pnpm storybook`, `pnpm build && pnpm preview`
```

`--service-ports` publishes the ports declared in `docker-compose.yml` (`3000` for
`pnpm dev`, `6006` for Storybook, `4173` for `pnpm preview`) to your host, so
`https://localhost:3000` works the same as running natively.

One important detail baked into `docker-compose.yml`: the `frontend` service mounts
`.:/app` (your whole repo) plus a separate anonymous volume at `/app/node_modules`.
That second mount matters — without it, `pnpm install` inside the Linux container would
install Linux-native binaries (esbuild, rollup, etc.) _through_ the bind mount and
overwrite your host's `node_modules`, breaking `pnpm dev` on macOS/Windows the next
time you ran it outside Docker. The anonymous volume keeps the container's
`node_modules` separate from your host's, at the cost of it not persisting between
separate `docker compose run` invocations — install once per session, not once ever.

### Deploying the backend

Both the frontend and the backend deploy automatically on every push to `main` via
`.github/workflows/deploy.yml` — there's no manual step for a routine deploy on
either side. The backend's `deploy_server` job builds the `api` image, pushes it to
`ghcr.io`, SCPs `docker-compose.prod.yml` + `Caddyfile` to the Hetzner box, and runs
`docker compose up -d` followed by `prisma migrate deploy` — the server never has the
repo checked out at all, it only ever pulls the pre-built image.

The one-time setup (provisioning the server, firewall rules, DNS, the GitHub Secrets
this workflow reads, adding the Caddy reverse proxy for TLS, and seeding the first
leader account, since the seed itself never runs automatically) is in
[`docs/HETZNER_DEPLOY.md`](docs/HETZNER_DEPLOY.md) — follow that end to end once, and
every push to `main` after that just works. Rebuilding after the server itself was
torn down is the shorter [`docs/HETZNER_REBUILD.md`](docs/HETZNER_REBUILD.md).

## Deploying

Both frontend and backend deploy automatically to their respective targets on every
push to `main` (`.github/workflows/deploy.yml`) — see
[How the frontend is hosted](#how-the-frontend-is-hosted) and
[Deploying the backend](#deploying-the-backend) above. The one manual, one-time setup
is in `docs/HETZNER_DEPLOY.md`.

## Screenshots

The nested Organizations tree example data (Region → Headquarter → Area → District → Group), with
per-node member counts and the map behind it:

![Organizations tree with nested hierarchy and member counts](docs/images/app-screenshot-org-hierarchy.png)
