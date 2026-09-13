# Deploying the backend to Hetzner

This guide covers the one-time server setup for running the backend (`db` + `api`)
on a Hetzner Cloud VPS. The frontend stays on GitHub Pages. Once the server is set up
per steps 1–8 below, subsequent deploys are fully automated via GitHub Actions — see
the [Automated CI/CD](#automated-cicd) section.

> **Rebuilding after you deleted the box?** Most of this (Hetzner project, DNS zone,
> GitHub secrets, the ghcr image) survives a teardown — use the short runbook in
> [`HETZNER_REBUILD.md`](./HETZNER_REBUILD.md) instead of starting here from zero.

Replace `YOUR_SERVER_IP` below with the actual server IP throughout. The API subdomain
used throughout this guide is `api.cowglow.io` — replace it if you ever move to a
different domain (steps 1, 2, 4, and 7 below read the domain, subdomain, GitHub repo,
frontend origin, and leader email from `deploy/hetzner/config.env` instead of having
you hand-edit them here — see step 0).

## 0. What you'll need first

- A Hetzner Cloud account and a project created in it, plus the
  [`hcloud` CLI](https://github.com/hetznercloud/cli) installed and pointed at that
  project (`hcloud context create visual-directory`, which prompts for an API token
  from **Console → Security → API Tokens**) — step 1 below uses it instead of the web
  console.
- `jq` installed (`brew install jq` / `apt install jq`) — `scripts/ionos-dns-upsert.sh`
  (step 2) uses it to parse the IONOS API's responses.
- A domain you control DNS for — here, `cowglow.io`, managed at IONOS, with an
  **API key** generated (IONOS hosting console → **API Keys**) so
  `scripts/ionos-dns-upsert.sh` (step 2) can point `api.cowglow.io` at the server
  without touching the DNS panel by hand. You do **not** need a domain for the
  frontend; that stays on GitHub Pages. `api.cowglow.io` is a dedicated subdomain
  just for this backend, so it's independent of whatever the root
  `cowglow.io`/`www.cowglow.io` records already point at.
- `deploy/hetzner/config.env`, copied from
  [`config.env.example`](../deploy/hetzner/config.env.example) with your real
  `DOMAIN`/`SUBDOMAIN`/`CLIENT_ORIGIN`/`LEADER_EMAIL`/`GITHUB_REPO` filled in — every
  command below that references one of those names assumes you've run
  `set -a; source deploy/hetzner/config.env; set +a` first. Keep `IONOS_API_KEY` and
  `GHCR_PAT` out of this file — export them directly in your shell instead (see the
  file's own header comment for why).
- A dedicated SSH key pair for this server, generated **passphrase-free** (GitHub
  Actions' SSH step can't unlock a passphrase-protected key non-interactively — using
  one is the single most common way this whole setup breaks), saved into `cert/` at
  the repo root rather than `~/.ssh` — that directory is gitignored, and keeping the
  deploy key there (instead of scattered across whichever machine happened to
  generate it) is what lets a future teardown/rebuild
  ([`HETZNER_REBUILD.md`](./HETZNER_REBUILD.md)) reuse it instead of rotating a new
  one. `ssh-keygen` ships with OpenSSH, so the command is nearly identical across
  systems — run it from the repo root:

  **macOS** — Terminal:
  ```bash
  mkdir -p cert
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f cert/id_hetzner -N ""
  ```

  **Ubuntu** — Terminal (`openssh-client` is preinstalled on the desktop image; if
  missing, `sudo apt install openssh-client` first):
  ```bash
  mkdir -p cert
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f cert/id_hetzner -N ""
  ```

  **Windows 11** — PowerShell (ships with the OpenSSH Client by default; if
  `ssh-keygen` isn't found, install it first with
  `Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0` in an admin
  PowerShell, or via **Settings → Optional Features → Add a feature → OpenSSH
  Client**):
  ```powershell
  New-Item -ItemType Directory -Force -Path cert | Out-Null
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f cert\id_hetzner -N '""'
  ```
  If the empty-passphrase quoting above misbehaves in your shell, just omit `-N` and
  press Enter twice at the passphrase prompts instead — same result.

  Either way this gives you `cert/id_hetzner` (private — `cert\id_hetzner` on
  Windows) which goes into the `HETZNER_SSH_KEY` GitHub secret in step 8, and
  `cert/id_hetzner.pub` (public) which goes on the server below. Keep working from
  the same machine (or just keep the repo's `cert/` directory) for the rest of this
  guide — later steps assume the key is at this path.

  Also generate a second, **passphrase-protected** key for your own manual access —
  `cert/id_hetzner_admin` — so you're never using the passphrase-free CI key by hand.
  [`SSH_KEY_SETUP.md`](./SSH_KEY_SETUP.md) covers generating this kind; add both
  `.pub` files to Hetzner in step 1 below, and use `id_hetzner_admin` everywhere
  later docs ([`VALIDATE_PRODUCTION.md`](./VALIDATE_PRODUCTION.md),
  [`WEBSTORM_PG_SETUP.md`](./WEBSTORM_PG_SETUP.md),
  [`HETZNER_ROOT_LOCKDOWN.md`](./HETZNER_ROOT_LOCKDOWN.md)) call for "the admin key."

## 1. Provision the server

**Add the SSH key to Hetzner *before* creating the server** — Hetzner Cloud only
injects a project's SSH keys into a server *at creation time*. Adding a key to the
project while a server already exists does **nothing** to that server's
`authorized_keys` — there's no retroactive push. If you add the key after the fact,
you'll get a server you can't SSH into and have to delete and recreate it.

Render `user-data.yml` from the template first (this is what replaces the old manual
"initial server setup" SSH session — see the template's own header comment for what
it does):

```bash
sed -e "s#\${CI_PUBLIC_KEY}#$(cat cert/id_hetzner.pub)#" \
    -e "s#\${ADMIN_PUBLIC_KEY}#$(cat cert/id_hetzner_admin.pub)#" \
    deploy/hetzner/user-data.yml.tmpl > deploy/hetzner/user-data.yml
```

Then, with `hcloud` pointed at your project (step 0). SSH keys and the firewall are
registered idempotently — `scripts/hcloud-ensure-ssh-key.sh` matches by the key's
fingerprint (not name) since Hetzner rejects re-uploading a public key that's already
registered under any name, and `scripts/hcloud-ensure-firewall.sh` checks by name
before creating — so re-running this against a project that already has either from a
previous setup reuses them instead of erroring:

```bash
CI_KEY_NAME=$(scripts/hcloud-ensure-ssh-key.sh github-actions-deploy cert/id_hetzner.pub)
ADMIN_KEY_NAME=$(scripts/hcloud-ensure-ssh-key.sh admin cert/id_hetzner_admin.pub)

scripts/hcloud-ensure-firewall.sh visual-directory <(cat <<'EOF'
[
  {"direction": "in", "protocol": "tcp", "port": "22", "source_ips": ["0.0.0.0/0", "::/0"]},
  {"direction": "in", "protocol": "tcp", "port": "80", "source_ips": ["0.0.0.0/0", "::/0"]},
  {"direction": "in", "protocol": "tcp", "port": "443", "source_ips": ["0.0.0.0/0", "::/0"]}
]
EOF
)

hcloud server create --name visual-directory \
  --image "$HETZNER_IMAGE" \
  --type "$HETZNER_SERVER_TYPE" \
  --location "$HETZNER_LOCATION" \
  --ssh-key "$CI_KEY_NAME" --ssh-key "$ADMIN_KEY_NAME" \
  --firewall visual-directory \
  --user-data-from-file deploy/hetzner/user-data.yml
```

`hcloud server create` itself is deliberately left non-idempotent — if a server named
`visual-directory` already exists, it fails outright rather than silently creating a
second one or reusing the wrong box. Run `hcloud server list` first if you're not sure
whether one already exists.

Restrict the `22/tcp` rule's `source_ips` to your own IP if it's stable — the example
above is intentionally open so a first run isn't blocked by whichever network you're
on. `80`/`443` need to stay open to the world (Caddy below). **Nothing else** should
ever be opened on this firewall — do not add `4000` (the API's raw port), `5432`
(Postgres), or `8081` (Adminer); see step 5 for why, and how you still get to Adminer
safely.

Note the server's public IP from the `hcloud server create` output (or
`hcloud server ip visual-directory`) — that's `YOUR_SERVER_IP` below. Cloud-init takes
a minute or two after boot to finish installing Docker and creating `deploy`; poll
until the key works:

```bash
until ssh -i cert/id_hetzner -o StrictHostKeyChecking=accept-new deploy@YOUR_SERVER_IP docker --version; do sleep 5; done
```

Prefer the web console instead? It has an equivalent **Cloud config** field on the
server-creation screen — paste the rendered `deploy/hetzner/user-data.yml` into it,
and pick both keys under **SSH keys**, with the same image/type/location/firewall
settings as above.

## 2. Point DNS at it

Domain is `$DOMAIN` (e.g. `cowglow.io`), managed at **IONOS**, with the `$SUBDOMAIN`
A record (e.g. `api`) independent of whatever `$DOMAIN`/`www.$DOMAIN` already point at
(likely a separate GitHub Pages project via its own `A`/`CNAME` records — this only
ever touches the `$SUBDOMAIN` record, never those).

```bash
IONOS_API_KEY=... SERVER_IP=YOUR_SERVER_IP scripts/ionos-dns-upsert.sh
```

(`DOMAIN`/`SUBDOMAIN` come from `deploy/hetzner/config.env`, already sourced per step
0.) The script looks up the zone, then creates the record if it's missing or updates
it in place if it already exists — either way it only ever touches that one record,
never anything else in the zone.

**Verify propagation:**

```bash
dig +short "$SUBDOMAIN.$DOMAIN" @1.1.1.1
# should print YOUR_SERVER_IP once propagated
```

IONOS is usually fast (minutes), but DNS can take up to a few hours depending on TTL
and resolver caching. If `dig` shows nothing or a stale value:

- Confirm the record actually landed: `curl -s -H "X-API-Key: $IONOS_API_KEY" "https://api.hosting.ionos.com/dns/v1/zones/$(curl -s -H "X-API-Key: $IONOS_API_KEY" https://api.hosting.ionos.com/dns/v1/zones | jq -r --arg d "$DOMAIN" '.[] | select(.name==$d) | .id')?recordName=$SUBDOMAIN"`.
- Try a different resolver to rule out local caching: `dig +short "$SUBDOMAIN.$DOMAIN" @8.8.8.8`.
- If you get a result but it's wrong, `dig +trace "$SUBDOMAIN.$DOMAIN"` shows exactly
  which nameserver is answering, useful for spotting a leftover record overriding the
  new one (e.g. one created by hand in the IONOS panel before this script existed).

Caddy (step 6) needs this record resolving correctly *before* it can issue a
certificate — if `curl https://api.cowglow.io/health` fails later with a TLS/cert
error, come back and re-check DNS here first.

## 3. Initial server setup

Cloud-init already did this at boot, from `deploy/hetzner/user-data.yml` (step 1): it
created the `deploy` user with both SSH keys authorized, installed Docker, added
`deploy` to the `docker` group, and gave it passwordless sudo. Nothing to do here by
hand — just confirm it actually landed:

```bash
ssh -i cert/id_hetzner deploy@YOUR_SERVER_IP 'docker --version && sudo -n true && echo ok'
```

From here on, SSH in as `ssh -i cert/id_hetzner deploy@YOUR_SERVER_IP` — and this is
the user GitHub Actions should deploy as (see `HETZNER_USER` in step 4), not `root`.
Once you've confirmed `deploy` works, consider following
[`HETZNER_ROOT_LOCKDOWN.md`](./HETZNER_ROOT_LOCKDOWN.md) to disable root SSH login
entirely.

If the command above fails, cloud-init may still be running (`ssh ... 'cloud-init
status --wait'` blocks until it finishes, then re-run the check) or it hit an error —
`ssh -i cert/id_hetzner root@YOUR_SERVER_IP 'cat /var/log/cloud-init-output.log'` shows
what happened.

## 4. Set the GitHub Secrets that drive the deploy

There's no manual `git clone`, no hand-written `.env`, and no editing
`docker-compose.yml` on the box — none of that is how this actually gets deployed.
The `deploy_server` job (see [Automated CI/CD](#automated-cicd) below) builds the API
image in CI, pushes it to `ghcr.io`, and on the server side only needs
`docker-compose.prod.yml` + `Caddyfile` (which it SCPs over itself) and a `.env` file
(which it writes itself, from GitHub Secrets) under `/opt/visual-directory/` — a
directory it also creates itself. The image is fully self-contained (compiled code,
`node_modules`, Prisma schema, `pnpm` all baked in via `backend/Dockerfile`), so the
server never needs the repo checked out at all.

So the one-time step here is just setting the secrets, not touching the server again.
Add everything in the [GitHub Secrets required](#github-secrets-required) table below
(`Settings → Secrets and variables → Actions`) — `HETZNER_HOST`/`HETZNER_USER`/
`HETZNER_SSH_KEY` from steps 1 and 3, plus `POSTGRES_USER`/`POSTGRES_PASSWORD`/
`POSTGRES_DB`/`JWT_SECRET`/`CLIENT_ORIGIN`/`GHCR_PAT`. Don't reuse the dev defaults in
`backend/.env.example` (`app`/`app` Postgres credentials, `dev-secret-change-me` JWT
secret) — fine for local dev where nothing is reachable from outside your machine,
not for a box on the public internet.

`RESEND_API_KEY`/`EMAIL_FROM` can be left unset for now — `getMailer()` in
`backend/src/infrastructure/mail/get-mailer.ts` falls back to `consoleMailer` (logs the magic link instead of
emailing it) whenever they're unset, so login still works. Set them up later via
[`RESEND_EMAIL_SETUP.md`](./RESEND_EMAIL_SETUP.md) when you want real email delivery.

`CLIENT_ORIGIN` must exactly match the origin your deployed frontend is served from
(protocol + host, no path) — this is what the API's CORS check compares against, so a
mismatch here means every request from the real frontend gets silently blocked by the
browser.

## 5. Push to trigger the deploy

```bash
git push origin main
```

This runs the `deploy_server` job, which builds and pushes the image, copies
`docker-compose.prod.yml`/`Caddyfile` to `/opt/visual-directory/` on the server,
writes `.env` from the secrets above, and runs
`docker compose -f docker-compose.prod.yml up -d` — bringing up `db`, `api`, and
`caddy` together (`docker-compose.prod.yml` deliberately has no `adminer` service —
see the "Adminer, when you actually need it" note in step 9 — and no frontend dev
service, since that's not how the real frontend is served). It then runs
`pnpm prisma:deploy` inside the running `api` container to apply migrations. Caddy
issues its Let's Encrypt certificate automatically on first start, as long as `80`/
`443` are reachable (firewall, step 1) and DNS resolves correctly (step 2).

Watch it run with `gh run watch --repo "$GITHUB_REPO"`, or check `Settings → Actions`
in the GitHub UI.

## 6. Confirm it's reachable

```bash
curl https://api.cowglow.io/health
# {"ok":true}
```

If this fails with a TLS error, re-check DNS (step 2) first — Caddy can't get a
certificate until `api.cowglow.io` actually resolves to the server.

## 7. Seed the first leader account (one-time, manual)

The automated deploy runs migrations but never the seed script — there's no account
to log in with until you create one, once:

```bash
ssh -i cert/id_hetzner deploy@YOUR_SERVER_IP \
  "cd /opt/visual-directory && docker compose -f docker-compose.prod.yml exec -T api sh -c \"SEED_LEADER_EMAIL=$LEADER_EMAIL pnpm seed\""
```

(`$LEADER_EMAIL` comes from `deploy/hetzner/config.env`, step 0.)

## 8. Point the frontend at it

Already done: the `deploy_client` job's build step in `.github/workflows/deploy.yml`
sets `VITE_API_URL: https://api.cowglow.io` (Vite env vars are compiled into the
bundle, not read at runtime — this has to happen at build time, which is why it's a
workflow env var rather than something set on the server). Without it, the production
build would silently fall back to `http://localhost:4000` (see
`src/infrastructure/api/api-client.ts`) and every API call from the live site would
fail. Nothing further to do here — flagged so you know why it's there if you ever
touch that workflow step.

## Automated CI/CD

After the one-time setup above is complete, every push to `main` triggers the
`deploy_server` job in `.github/workflows/deploy.yml`, which:

1. Builds the API image from `backend/Dockerfile` and pushes it to
   `ghcr.io/cowglow/visual-directory-api:latest`.
2. SCPs `docker-compose.prod.yml` to `/opt/visual-directory/` on the server.
3. SSHes in, writes secrets to `/opt/visual-directory/.env` (mode `600`), pulls the
   new image, and restarts the stack with `docker compose up -d`.
4. Runs `pnpm prisma:deploy` inside the running `api` container to apply any pending
   migrations.

### GitHub Secrets required

Add these in `Settings → Secrets and variables → Actions`:

| Secret | Description |
|---|---|
| `HETZNER_HOST` | Server IP or domain |
| `HETZNER_USER` | SSH user (e.g. `deploy`) |
| `HETZNER_SSH_KEY` | Full private key (`-----BEGIN...-----END...`) |
| `POSTGRES_USER` | Database username |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name (e.g. `contact_book`) |
| `JWT_SECRET` | Random secret string for JWT signing |
| `CLIENT_ORIGIN` | The frontend's exact origin — scheme + host, **no path** (e.g. `https://cowglow.github.io`, not `.../visual-directory`) — must match the browser's `Origin` header exactly for CORS to pass |
| `RESEND_API_KEY` | *(optional — see [`RESEND_EMAIL_SETUP.md`](./RESEND_EMAIL_SETUP.md))* API key for sending real magic-link emails; unset means console-logged links instead |
| `EMAIL_FROM` | *(optional, same as above)* Sender address, e.g. `Visual Directory <login@mail.cowglow.io>` — domain must be verified in Resend first |
| `GHCR_PAT` | GitHub PAT with `read:packages` scope — lets the server pull the image |

To create `GHCR_PAT`: `github.com → Settings → Developer settings → Personal access
tokens → Fine-grained` with `read:packages` scope.

### Setting/updating secrets via `gh` CLI

Faster than clicking through the web UI, and the only sane way to set
`HETZNER_SSH_KEY` without mangling newlines. Whenever the server is recreated (new IP)
or the deploy key is rotated (new keypair), these three need to be updated together —
they describe how to reach a specific box as a specific user with a specific key, so a
stale value in any one of them breaks the SSH step of the workflow:

```bash
gh secret set HETZNER_HOST --repo "$GITHUB_REPO" --body "YOUR_SERVER_IP"
gh secret set HETZNER_USER --repo "$GITHUB_REPO" --body "deploy"
gh secret set HETZNER_SSH_KEY --repo "$GITHUB_REPO" < cert/id_hetzner
```

The rest, set once and rarely touched again (`$GITHUB_REPO`/`$CLIENT_ORIGIN` come from
`deploy/hetzner/config.env`, step 0; paste your real `GHCR_PAT` in place of
`YOUR_GHCR_PAT`):

```bash
gh secret set POSTGRES_USER --repo "$GITHUB_REPO" --body "app"
gh secret set POSTGRES_PASSWORD --repo "$GITHUB_REPO" --body "$(openssl rand -hex 24)"
gh secret set POSTGRES_DB --repo "$GITHUB_REPO" --body "contact_book"
gh secret set JWT_SECRET --repo "$GITHUB_REPO" --body "$(openssl rand -hex 32)"
gh secret set CLIENT_ORIGIN --repo "$GITHUB_REPO" --body "$CLIENT_ORIGIN"
gh secret set GHCR_PAT --repo "$GITHUB_REPO" --body "YOUR_GHCR_PAT"
```

`RESEND_API_KEY`/`EMAIL_FROM` are skipped here on purpose — leave them unset until
you've done [`RESEND_EMAIL_SETUP.md`](./RESEND_EMAIL_SETUP.md); the `gh secret set`
commands for them are in that doc.

Verify what's set (values aren't shown, only names/update times) and re-run the
workflow to confirm the new secrets actually work end-to-end:

```bash
gh secret list --repo "$GITHUB_REPO"
gh workflow run deploy.yml --repo "$GITHUB_REPO"
gh run watch --repo "$GITHUB_REPO"
```

### Production compose file

`docker-compose.prod.yml` (in the repo root) is the production-only stack — no dev
frontend service, no Adminer. It uses the pre-built image from `ghcr.io` rather than
building on the server:

- `db` — Postgres 16, data in the `postgres-data` named volume, with a healthcheck.
- `api` — pulls `ghcr.io/cowglow/visual-directory-api:latest`; waits for `db` to be
  healthy before starting.

The workflow copies this file to the server on every deploy, so changes to it are
picked up automatically.

## 9. Ongoing operations

- **Logs**: `docker compose logs -f api` (or `db`, `caddy`).
- **Redeploy after a code change**: push to `main` — CI/CD handles it automatically.
  To redeploy manually: `docker compose -f docker-compose.prod.yml pull api && docker compose -f docker-compose.prod.yml up -d`.
- **New migrations**: CI/CD runs `pnpm prisma:deploy` automatically on every deploy.
  To run manually: `docker compose -f docker-compose.prod.yml exec api pnpm prisma:deploy`.
- **Backups**: there is currently no backup of any kind — not a scheduled job, not
  even a manual habit. `postgres-data` is this database's only copy. This is a
  known, accepted gap for now, not an oversight: the plan is for this app to
  eventually ingest from Asana as the real system of record, at which point this
  Postgres instance stops being the one place the data lives. Until that happens,
  losing this volume means losing every member's data outright, so revisit this
  the moment real member data goes in here that you'd mind losing. When ready to
  add a backup, the minimum viable version is:
  `docker compose exec db pg_dump -U app contact_book > backup-$(date +%F).sql`,
  copied somewhere off the box (Hetzner Storage Box, or just `scp` it out on a cron).
- **Wiping the data on purpose**: `docker compose down` (no flags) does **not**
  delete `postgres-data` — Compose only removes named volumes when you pass
  `--volumes`/`-v`, so the data survives a plain `down`/`up` cycle. To actually
  destroy it — the fail-safe/"kill switch" this project is currently relying on
  instead of a backup — run `docker compose -f docker-compose.prod.yml down --volumes`
  or `docker volume rm visual-directory_postgres-data` directly. Treat that command
  with the same care as `rm -rf`: there is nothing to restore from once it runs.
- **Adminer, when you actually need it**: rather than exposing it publicly, tunnel to
  it over SSH when needed: `ssh -L 8081:localhost:8081 deploy@YOUR_SERVER_IP`, then
  `docker compose up -d adminer` on the box and visit `http://localhost:8081` on your
  own machine. Stop the `adminer` container again when you're done.
