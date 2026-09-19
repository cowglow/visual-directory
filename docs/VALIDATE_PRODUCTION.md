# Validating production from the Mac terminal

A quick checklist to confirm the production deploy (`docs/HETZNER_DEPLOY.md`) is
actually healthy end-to-end, without opening a browser. Useful right after a
`git push origin main` triggers `deploy_server`/`deploy_client`
(`.github/workflows/deploy.yml`), or any time you want to sanity-check prod.

Set once per terminal session so the rest of the commands below can be copy-pasted:

```bash
export HETZNER_HOST=YOUR_SERVER_IP        # or the domain, if DNS points at it
export HETZNER_KEY=cert/id_hetzner_admin
```

The box has two keys authorized: `github-actions-deploy` (passphrase-free, used only
by CI — see `docs/HETZNER_DEPLOY.md`) and a personal `id_hetzner_admin` key for manual
access like this. Use `-i $HETZNER_KEY` below rather than the CI key, even though both
would work — keeps the passphrase-free key exclusively for automation.

## 0. Confirm the key itself works, before touching the network

Rules out "the key is broken" as a cause if steps 6-8 later fail to connect (full
detail in `docs/SSH_KEY_SETUP.md`'s "Verifying a key locally" section):

```bash
ssh-keygen -y -f $HETZNER_KEY   # prompts for the passphrase; should print a public key
diff <(ssh-keygen -y -f $HETZNER_KEY) $HETZNER_KEY.pub && echo "match"
```

Then confirm it's actually accepted by the server:

```bash
ssh -i $HETZNER_KEY deploy@$HETZNER_HOST whoami
# deploy
```

## 1. Did the deploy actually run?

```bash
gh run list --repo cowglow/visual-directory --workflow=deploy.yml --limit 5
```

Look for the latest run against your commit with status `completed` / conclusion
`success`. If it's still `in_progress`:

```bash
gh run watch --repo cowglow/visual-directory
```

## 2. DNS resolves

```bash
dig +short api.cowglow.io
```

Should return the Hetzner box's IP. If empty or stale, Caddy can't issue/renew its
TLS certificate (step 2 of `docs/HETZNER_DEPLOY.md`) and everything below will fail.

## 3. API is reachable and healthy

```bash
curl -sS https://api.cowglow.io/health
# {"ok":true}
```

If this hangs or errors with a TLS problem, check the certificate directly:

```bash
echo | openssl s_client -connect api.cowglow.io:443 -servername api.cowglow.io 2>/dev/null \
  | openssl x509 -noout -dates -subject
```

`notAfter` should be well in the future (Caddy auto-renews Let's Encrypt certs); an
expired or mismatched `subject` usually means DNS pointed somewhere else when Caddy
first started.

## 4. CORS is configured for the real frontend

A request with the frontend's `Origin` header should be allowed; anything else should
not, confirming `CLIENT_ORIGIN` (GitHub Secret) matches the deployed frontend exactly:

```bash
curl -sS -i -X OPTIONS https://api.cowglow.io/health \
  -H "Origin: https://cowglow.github.io" \
  -H "Access-Control-Request-Method: GET" \
  | grep -i "access-control-allow-origin"
```

Should echo back `https://cowglow.github.io`. If it's missing or wrong, the real
frontend's requests are being silently blocked by the browser even though `curl`
itself can reach the API fine (`curl` doesn't enforce CORS — this only matters in a
real browser, which is why the check above is necessary).

## 5. Frontend is live and pointed at the right API

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://cowglow.github.io/visual-directory/
# 200

curl -sS https://cowglow.github.io/visual-directory/assets/*.js 2>/dev/null \
  | grep -o "https://api\.cowglow\.io" | head -1
```

The second command confirms the build actually baked in `VITE_API_URL:
https://api.cowglow.io` (set in the `deploy_client` job) rather than falling back to
`http://localhost:4000` — a silent failure mode called out in
`docs/HETZNER_DEPLOY.md` step 8. (Asset filename is content-hashed, so the glob may
need adjusting — check `https://cowglow.github.io/visual-directory/` view-source for
the exact `assets/index-*.js` name if it doesn't match.)

## 6. Containers on the box are healthy

```bash
ssh -i $HETZNER_KEY deploy@$HETZNER_HOST \
  "docker compose -f /opt/visual-directory/docker-compose.prod.yml ps"
```

All three (`db`, `api`, `caddy`) should show `Up` (`db` additionally `healthy`, per
its healthcheck). Anything `Restarting` or `Exited` means check its logs next:

```bash
ssh -i $HETZNER_KEY deploy@$HETZNER_HOST \
  "docker compose -f /opt/visual-directory/docker-compose.prod.yml logs --tail=100 api"
```

## 7. Migrations are applied

```bash
ssh -i $HETZNER_KEY deploy@$HETZNER_HOST \
  "docker compose -f /opt/visual-directory/docker-compose.prod.yml exec -T api pnpm prisma migrate status"
```

Should say "Database schema is up to date" — CI runs `prisma:deploy` automatically on
every push, so this only really matters if a migration failed silently.

## 8. Disk space (Postgres data has no rotation)

```bash
ssh -i $HETZNER_KEY deploy@$HETZNER_HOST "df -h /"
```

Worth a glance periodically since `postgres-data` is an ever-growing named volume with
no automated pruning (see the **Backups** note in `docs/HETZNER_DEPLOY.md` step 9).

## 9. Magic-link email actually sends

Steps 3 and 6 confirm the API is up, not that the magic-link email path works. By
design, `POST /auth/magic-link` always returns the same `200` — whether or not an
Account exists for that email, and (before request logging was added, see
[`OBSERVABILITY_LOGGING.md`](./OBSERVABILITY_LOGGING.md)) whether or not Resend
actually sent anything — so a healthy-looking response here proves nothing on its
own. Trigger a real request against an email with a known Account and check for the
positive log line, not just the absence of an error:

```bash
curl -sS -X POST https://api.cowglow.io/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_TEST_ACCOUNT_EMAIL"}'

ssh -i $HETZNER_KEY deploy@$HETZNER_HOST \
  "docker compose -f /opt/visual-directory/docker-compose.prod.yml logs --tail=20 api"
```

Look for exactly one of these three, logged by `requestMagicLink`
(`backend/src/application/auth/auth.use-cases.ts`):

- `[auth] magic-link sent to ...` — the real path worked, `mailer.sendMagicLink`
  resolved. Cross-check actual delivery in the Resend dashboard, or:
  `curl -sS -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/emails`
  — the matching entry's `last_event` should reach `delivered`.
- `[auth] magic-link request: no account found for ...` — the request itself is
  fine, there's just no Account for that email yet. Use a real invited account's
  email instead, or invite one first (`POST /auth/invite`, leader-only).
- No `[auth]` line at all, but `[mailer] failed to send magic-link email to ...` —
  `resendMailer` was called and Resend rejected it. The logged error is the actual
  Resend API error; read it directly rather than guessing (sandbox/unverified-domain
  restrictions are the common cause — see
  [`RESEND_EMAIL_SETUP.md`](./RESEND_EMAIL_SETUP.md)).

## If something's wrong

- Steps 1-5 fail → check GitHub Actions logs first (`gh run view --log-failed`),
  they'll usually show which half (client build vs. server deploy) broke.
- Steps 6-8 need the box itself → SSH in per `docs/HETZNER_DEPLOY.md`; for DB-level
  inspection use `docs/WEBSTORM_PG_SETUP.md`'s production tunnel section.
