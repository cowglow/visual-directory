# WebStorm Postgres connection

WebStorm's built-in Database tool (same engine as DataGrip) can connect straight to
the local Postgres container started by `pnpm backend:up` / `pnpm dev:all`, so you can
browse and query `Account` / `Member` / `Organization` / `AuditLogEntry` without going
through Adminer or `psql`.

## Local (dev) database

### Prerequisites

The `db` container must be running — `docker-compose.yml` maps it to `5432:5432` on
the host, so this works the same whether you started the stack with `pnpm backend:up`
or `pnpm dev:all`:

```bash
pnpm backend:up   # or pnpm dev:all
```

### Connection values

Defaults come from `docker-compose.yml`'s `${VAR:-default}` fallbacks; if you copied
`.env.example` to `.env` at the repo root without changing anything, these are exactly
what's in there:

| Field    | Value                                           |
| -------- | ----------------------------------------------- |
| Host     | `localhost`                                     |
| Port     | `5432`                                          |
| Database | `contact_book`                                  |
| User     | `app`                                           |
| Password | `app`                                           |
| URL      | `jdbc:postgresql://localhost:5432/contact_book` |

If your `.env` overrides `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`, use those
values instead — they're what's actually inside the running container, not the
defaults above.

### Steps

1. Open the **Database** tool window (`View → Tool Windows → Database`, or search
   "Database" in Help → Find Action).
2. Click **+** → **Data Source** → **PostgreSQL**.
3. Fill in Host/Port/Database/User/Password from the table above.
4. On first connection WebStorm will prompt to download the PostgreSQL JDBC driver —
   accept it (**Download driver files**).
5. Click **Test Connection** — should show a green check. If it fails, confirm the
   container is actually up: `docker compose ps db` should show `healthy`.
6. Click **OK**. The `contact_book` database now appears in the tool window, with
   `Account`, `Member`, `Organization`, `MagicLinkToken`, and `AuditLogEntry` tables
   under the `public` schema (from `backend/prisma/schema.prisma`).

### Notes

This connects directly to Postgres, bypassing Prisma and the API entirely — fine for
inspecting data, but don't hand-edit rows you expect the app (or the audit log hash
chain in `backend/src/infrastructure/prisma/audit-log.ts`) to stay consistent with.

## Production database (via SSH tunnel)

`docker-compose.prod.yml`'s `db` service has **no `ports:` mapping at all** — Postgres
is reachable only from inside the server's Docker network, not from the host, let
alone the public internet. That's deliberate (see `docs/HETZNER_DEPLOY.md`), so
reaching it from WebStorm means tunneling through SSH access to the same `deploy`
account used for deployment, to the container's internal IP rather than `localhost`.

The box has two keys authorized for `deploy`: `github-actions-deploy` (passphrase-free,
used only by CI — see `docs/HETZNER_DEPLOY.md`) and a personal `id_hetzner_admin` key
for manual access like this. Prefer the admin key below over the CI one — but if you
don't have/remember its passphrase, the CI key works too (it's just meant to stay
exclusive to automation as a matter of hygiene, not a hard technical requirement):

```bash
export HETZNER_KEY=cert/id_hetzner_admin   # or cert/id_hetzner if you don't have this one's passphrase
```

`$HETZNER_KEY` is a relative path — the commands below only resolve it correctly if
your shell's current directory is the repo root. Running from anywhere else (e.g. your
home directory), use the absolute path instead, e.g.
`/Users/you/path/to/visual-directory/cert/id_hetzner_admin`.

`id_hetzner_admin` is passphrase-protected — every `ssh`/`scp` command below using it
will prompt for that passphrase interactively. That's expected, not an error; a
"Permission denied (publickey,password)" instead means either the wrong path was
given (falls through to password auth, which isn't configured at all) or the
passphrase itself was wrong.

Treat this as read-only, debugging-only access. Prefer the app/API for anything that
should show up correctly — any row you edit or insert directly bypasses the
hash-chained audit log in `backend/src/infrastructure/prisma/audit-log.ts` entirely, silently breaking
the guarantee that every write is logged.

### 1. Find the container's internal IP

```bash
ssh -i $HETZNER_KEY deploy@YOUR_SERVER_IP \
  "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' visual-directory-db"
```

### 2. Open an SSH tunnel to it

Forward a local port to `<container_ip>:5432` (not `localhost:5432` on the
server — nothing is listening there). Pick a local port other than `5432` if your
local dev Postgres (above) is also running, e.g. `55432`:

```bash
ssh -i $HETZNER_KEY -L 55432:<container_ip>:5432 deploy@YOUR_SERVER_IP
```

Leave this running for the duration of your session; `Ctrl+C` closes the tunnel.

### 3. Get the real credentials

These exist only in GitHub Secrets and the server's `/opt/visual-directory/.env` —
never in git, and `gh secret` can't read secret values back once set:

```bash
ssh -i $HETZNER_KEY deploy@YOUR_SERVER_IP "cat /opt/visual-directory/.env"
```

Read off `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`.

### 4. Add the Data Source in WebStorm

Same as the [local steps](#steps) above, but:

- Host: `localhost` — **not** the server's IP. WebStorm never talks to the server
  directly; it only ever connects to the local end of the tunnel from step 2, which
  your terminal's `ssh -L` is silently relaying to the container on the other end.
- Port: whatever you forwarded in step 2 (e.g. `55432`)
- Database/User/Password: from step 3
- Name it clearly, e.g. **"contact_book (PRODUCTION)"** — it'll otherwise look
  identical to the dev connection in the tool window, which is exactly how someone
  runs a dev-only query against real member data by mistake.

**Leave the SSH/SSL tab off entirely.** Don't enter the SSH key there to have
WebStorm establish its own tunnel — its bundled SSH library (JSch) can't parse
`id_hetzner_admin`/`id_hetzner`'s key format (ed25519 keys are only ever stored as
"OPENSSH PRIVATE KEY", which older JSch versions reject with an `unrecognised
object: OPENSSH PRIVATE KEY` error). The terminal-based tunnel from step 2 already
handles this outside WebStorm's knowledge; don't configure it twice. Likewise leave
the SSL sub-tab's **Client certificate/key/root certificate** fields empty and SSL
mode at `Disable`/`Prefer` — this database has no SSL certificate setup at all, so
those fields are for a different (Postgres-level) mechanism this server doesn't use.

Close the SSH tunnel when you're done; don't leave production reachable from your
machine unattended.
