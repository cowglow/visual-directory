# Setting up Resend for magic-link emails

This is a follow-up to [`HETZNER_DEPLOY.md`](./HETZNER_DEPLOY.md), not part of the
one-time server setup there — do this once the server is up and deploying
successfully, since it's not required to get to a working deploy.

## Why this can wait

`getMailer()` in `backend/src/infrastructure/mail/get-mailer.ts` falls back to `consoleMailer` (logs the magic
link server-side instead of emailing it) whenever `RESEND_API_KEY`/`EMAIL_FROM` aren't
both set. So the app — including login — works fine with neither var set; you just
read the link from `docker compose logs api` instead of getting an email. Real users
can't get their link by email until this is done, but nothing in `HETZNER_DEPLOY.md`
depends on it.

**Local dev note**: the root `.env` has a real Resend sandbox key checked in for testing
the directory app's own delivery, but Resend's sandbox sender can only deliver to the
account owner's own address — any other email (including a seeded test leader) will
fail with "Couldn't send the login email." Run `pnpm backend:up:local` instead of
`pnpm backend:up` to force `RESEND_API_KEY`/`EMAIL_FROM` empty for that session, which
falls back to `consoleMailer` and — since `NODE_ENV` is `development` by default —
makes every magic-link request return a `devToken` the frontend auto-verifies with
immediately, no email needed for any address.

## Setting up Resend + domain verification

1. Sign up at [resend.com](https://resend.com) (free tier is enough here).
2. Dashboard → **Domains → Add Domain**. Use a **subdomain**, not the root domain —
   e.g. `mail.cowglow.io` — so this app's email-sending reputation is isolated from
   `cowglow.io`/`www.cowglow.io`'s own reputation (recommended by Resend, and means a
   sending problem here can't affect anything else on the root domain).
3. Resend shows you a set of DNS records to add (typically an `MX` and one or more
   `TXT` records for DKIM, under the `mail` host — exact values are generated
   per-domain, so copy them from Resend's dashboard directly rather than guessing).
4. Add each record at IONOS the same way as `HETZNER_DEPLOY.md` step 2 (**Domains &
   SSL** → `cowglow.io` → **DNS** → **Add record**) — same "host name field usually
   wants just the subdomain part, not the full FQDN" caveat applies here too, e.g.
   host `mail` for an `MX` record, or `resend._domainkey.mail` for a DKIM `TXT` record
   if that's what Resend gives you.
5. Back in Resend, click **Verify** (or wait — it polls automatically). DNS
   propagation delays apply same as the `api` subdomain; if verification is stuck
   after a while, double check each record's host/type/value matches exactly what
   Resend's dashboard shows, and `dig +short TXT resend._domainkey.mail.cowglow.io`
   (adjust for whatever host Resend actually asked for) to confirm it resolves.
6. Once verified, get an API key: Dashboard → **API Keys → Create API Key**.
7. Set the two secrets — both locally in `~/app/.env` on the server and as GitHub
   secrets (so CI/CD writes them too):
   ```bash
   RESEND_API_KEY=re_...
   EMAIL_FROM=Visual Directory <login@mail.cowglow.io>
   ```
   ```bash
   gh secret set RESEND_API_KEY --repo cowglow/visual-directory --body "re_..."
   gh secret set EMAIL_FROM --repo cowglow/visual-directory --body "Visual Directory <login@mail.cowglow.io>"
   ```
8. Test end-to-end: trigger a magic-link request against the real API and confirm the
   email actually arrives (not just logged). `docker compose logs api` should show a
   positive `[auth] magic-link sent to ...` line for that request (logged by
   `requestMagicLink` in `backend/src/application/auth/auth.use-cases.ts`) — don't
   just check for the *absence* of the `consoleMailer` fallback line, since a request
   for an email with no Account yet returns the exact same `200` response and, before
   this logging was added, produced no output at all either way (see
   [`OBSERVABILITY_LOGGING.md`](./OBSERVABILITY_LOGGING.md)). See
   [`VALIDATE_PRODUCTION.md`](./VALIDATE_PRODUCTION.md)'s magic-link step for the full
   command sequence, including cross-checking delivery in Resend's own dashboard.
