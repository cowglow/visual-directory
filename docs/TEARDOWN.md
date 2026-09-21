# Tearing down the Meckenhausen Halloween map's server

A runbook for destroying the Hetzner VPS after the event is over, once the
map's own data retention has already run its course. **This document is
read-only guidance - nothing in this repo or this session runs any of the
commands below.** Follow it yourself, in order, from a machine with `hcloud`,
`ssh`, and this repo checked out.

This server (`visual-directory`, see `docs/HETZNER_DEPLOY.md` /
`docs/HETZNER_REBUILD.md`) also runs the **directory app's own backend** -
`db` + `api` + `caddy` via `docker-compose.prod.yml`, all sharing one
Postgres. Section 0 below exists because destroying it destroys the
directory too, not just this map.

## 0. Confirm nothing else lives on this server

Do not proceed past this step until you've verified both of these:

- **Is the directory app (the member/organization tool this monorepo also
  ships) still in active use by anyone?** It shares this exact server,
  database container, and Caddy instance with the Halloween map - there is
  no way to tear down "just the map's infrastructure" without also taking
  the directory offline. If the directory is still needed, **stop here** -
  destroying the server is the wrong move; instead run `pnpm purge:space`
  (section 2 below) and leave the server itself alone.
- **Is anything else deployed to this box that isn't in this repo?**
  `ssh -i cert/id_hetzner_admin deploy@<server-ip>` and check
  `docker compose ls` / `docker ps -a` for containers this repo didn't
  start, and `crontab -l` for scheduled jobs. If you find anything, resolve
  it (migrate it elsewhere, or confirm with whoever owns it) before
  continuing.

## 1. Run the purge first

Even though the server is being destroyed, purge the map's data
deliberately rather than relying on the destroy taking care of it - a purge
is auditable (it prints counts) and is the same code path used for the
`EVENT_END_AT` retention deadline itself, so it's worth confirming it still
works cleanly before the server it runs on disappears:

```bash
cd backend
pnpm purge:space -- --slug meckenhausen --yes
```

(See `backend/prisma/purge-space.ts` - dry-run without `--yes` first if you
want to see the counts before committing.)

## 2. Delete backups, dumps, snapshots, and volumes

- **Hetzner-side snapshots/volumes**: none exist for this project - it uses
  only the two Docker-managed named volumes below, not Hetzner Cloud Volumes
  or snapshots. Nothing to delete at the Hetzner API/console level here.
- **The Postgres data volume** (`visual-directory_postgres-data`, declared in
  `docker-compose.prod.yml`): destroyed automatically when you tear down the
  compose stack with `docker compose down --volumes` (see step 5) - no
  separate step needed. There is, deliberately, **no backup of this
  database anywhere** (`docs/HETZNER_DEPLOY.md` "Backups" -  a known,
  accepted gap for this prototype-phase project), so there's nothing
  further to find and delete on that front. If anyone *did* ever run the
  manual `pg_dump` command that doc shows as an option, search for a
  `backup-*.sql` file both on the server (`~deploy/`) and on any laptop that
  might have pulled one down, and delete it.
- **The Caddy data volume** (`caddy-data` - TLS certs/ACME state): also
  destroyed by `docker compose down --volumes` in step 5.

## 3. Delete DNS records

One record exists for this deployment: `api.cowglow.io` (A record, at
**IONOS**, upserted by `scripts/ionos-dns-upsert.sh` - see
`docs/HETZNER_DEPLOY.md` section 2). Remove it from the IONOS DNS console
once the server it points to is gone (or first - a dangling A record
pointing at a destroyed server is only a stale-DNS annoyance, not a
security issue, but there's no reason to leave it). The frontend's own
domain (GitHub Pages) is unaffected either way.

## 4. Delete email-provider records/logs

Resend itself keeps no long-lived "logs" this project's docs point at
cleaning up (`docs/RESEND_EMAIL_SETUP.md` only covers setup, not teardown).
Two things worth doing once this server is retired:

- Revoke/delete the Resend API key used in the `RESEND_API_KEY` GitHub
  secret (Resend dashboard → API Keys), since it becomes dead credential
  material otherwise, not because it grants access to anything on this
  server.
- If `mail.cowglow.io` (the sending subdomain, DNS records also at IONOS per
  the same doc) was set up *only* for this event, remove its MX/TXT/DKIM
  records at IONOS too. Leave it if the directory app (or anything else)
  still sends mail through it.

## 5. Local dev databases and CI artifacts

- **Local dev Postgres** (this repo's own `docker compose up -d db`, a
  completely separate container/volume from the Hetzner one): if it was
  ever seeded with real Meckenhausen participant data (rather than
  synthetic/dev-only data) for testing, purge it the same way as step 1,
  pointed at your local `DATABASE_URL`, or just `docker compose down
  --volumes` your local stack to drop it entirely. Under normal development
  this volume never holds anything but disposable fixtures - only worth
  checking if you're not sure.
- **GitHub Actions**: nothing job-specific to this map to clean up - the
  `deploy_server` job (`.github/workflows/deploy.yml`) doesn't cache
  anything containing participant data, and its build artifacts are just
  the compiled API image (see below). Actions run logs age out on GitHub's
  own retention schedule; no manual action needed there.

## 6. Then destroy the server

Once 0-5 are done:

1. **Server**: Hetzner Cloud Console → the `visual-directory` server →
   Delete. (No `hcloud server delete` CLI invocation is documented anywhere
   in this repo - `docs/HETZNER_REBUILD.md` describes doing this from the
   console, so that's the path to follow rather than guessing at CLI flags.)
2. **Firewall**: also delete the `visual-directory` firewall resource in the
   console (created by `scripts/hcloud-ensure-firewall.sh` - not removed
   automatically when the server is).

**Deliberately left alone**, per `docs/HETZNER_REBUILD.md`'s own notes on
what survives a teardown - these aren't specific to the map, they're shared
project infrastructure with no reason to rotate just because this server is
gone:

- The SSH keypairs in `cert/` (`id_hetzner`, `id_hetzner_admin`) and the
  matching keys registered in the Hetzner project - reused on any future
  rebuild.
- The GitHub Secrets (`HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY`,
  `POSTGRES_*`, `JWT_SECRET`, `SPACE_JWT_SECRET`, `CLIENT_ORIGIN`,
  `RESEND_API_KEY`, `EMAIL_FROM`, `GHCR_PAT`).
- The API container image on `ghcr.io/cowglow/visual-directory-api:latest`.

If the directory app itself is also being retired (not just this map),
those should be cleaned up too, but that's a separate decision from this
runbook - see `docs/HETZNER_REBUILD.md` before touching any of them.
