# Adding request logging

**Status: Option B implemented** (`request-logger.ts` middleware, the two
`[auth]`-prefixed log lines in `requestMagicLink`, and the `Caddyfile`'s `log`
directive are all in place — see the "Option B" section below for what each one
does). Not yet deployed to prod as of this writing. Option A (`pino-http`) is still
just a plan, for whenever a new dependency is okay.

## Why

Debugging a prod magic-link delivery issue (2026-09-19) turned up a real gap: the API
has no request-level logging at all. `backend/src/ports/http/app.ts` wires `helmet` →
`cors` → `express.json()` → the routers → `errorHandler`, with nothing in between. The
only `console.*` calls anywhere in `backend/src` are:

- `index.ts` — one line at startup (`API listening on ...`)
- `infrastructure/mail/console-mailer.ts` — the dev-only fallback mailer's link line,
  never hit in prod since `RESEND_API_KEY`/`EMAIL_FROM` are set there
- `application/auth/auth.use-cases.ts` — `console.error` only when `mailer.sendMagicLink`
  throws
- `ports/http/middleware/error-handler.ts` — `console.error(err)` only for an
  unhandled route error

A **successful** request — including a successful magic-link send — produces zero
output. Confirmed directly against the prod container's raw json-file log
(`/var/lib/docker/containers/<id>/<id>-json.log`, bypassing `docker logs`): one line,
written at container start, nothing since, despite real traffic. This isn't a Docker
or `docker-compose.prod.yml` logging bug — Docker's log driver is working fine, the
app just never prints anything on the happy path.

## Constraint

No new dependency right now. Two options that need one don't apply here:
`pino-http`/`morgan` would be the obvious pick eventually, but this doc is the plan
for *if/when* that constraint lifts, plus a zero-dependency option to do in the
meantime.

## Option A: `pino-http` (deferred until a new dep is okay)

Add `pino-http` to `backend/package.json` and wire it as the first `app.use()` in
`createApp()` (`backend/src/ports/http/app.ts`), before `helmet`:

```ts
import pinoHttp from "pino-http";

app.use(pinoHttp());
```

Gives structured JSON logs per request (method, path, status, response time,
request id) with sane defaults — redaction, error serialization, etc. — instead of
hand-rolling those. Pull request-scoped logging into use-cases later (e.g. log
`requestMagicLink` success/failure with the request id) by passing `req.log` down,
rather than reaching for the bare `console`.

Tradeoff: one more dependency to keep patched, and pino's default output is
newline-delimited JSON — fine for `docker logs | jq`, less pleasant to eyeball raw.

## Option B (zero-dependency, implemented): hand-rolled middleware + Caddy access log

**1. Minimal request-logging middleware** —
`backend/src/ports/http/middleware/request-logger.ts`, wired as `app.use(requestLogger)`
right after `app.set("trust proxy", 1)` in `createApp()`, before `helmet`. Just
`console.log` plus `res.on("finish", ...)`, covered by
`request-logger.test.ts` (spins up a bare `express()` app on an ephemeral port,
spies on `console.log`, asserts the logged line for both a 200 and a 500 response).

Gets every request's method/path/status/duration into `docker logs
visual-directory-api` — including successful ones — with no dependency and no
formatting/rotation niceties. Good enough to answer "did this request even reach the
API, and what did it return" during the next incident like this one.

**1b. Two extra log lines in `requestMagicLink` itself**
(`backend/src/application/auth/auth.use-cases.ts`), covered by
`auth.use-cases.test.ts`:

- `[auth] magic-link request: no account found for <email>` on the early-return path
  when `accountRepository.findByEmail` comes back empty. Server-side only — the HTTP
  response is still the same generic message either way, so this doesn't weaken the
  anti-enumeration design, it just makes the "account didn't exist yet" case
  distinguishable in the logs instead of looking identical to a real send.
- `[auth] magic-link sent to <email>` once `mailer.sendMagicLink` resolves
  successfully.

Together with the existing `[mailer] failed to send...` line on a thrown/rejected
send, every branch of `requestMagicLink` is now observable: no-account, sent, or
failed.

**2. Turn on Caddy's built-in access log.** Caddy already logs (its ACME/TLS
housekeeping shows up in `docker logs visual-directory-caddy` today) — the site block
in `Caddyfile` just has no `log` directive:

```
api.cowglow.io {
	log
	reverse_proxy api:4000
}
```

This logs at the edge — before the request reaches the API container at all — so it's
the fastest way to rule proxy/CORS/rate-limit issues in or out, independent of
whether the app container is logging anything. No app code change, no rebuild of the
`api` image, just a `Caddyfile` edit + `docker compose -f docker-compose.prod.yml
restart caddy` (or redeploy).

Do both — Caddy's log confirms the request arrived at all; the app middleware shows
what happened once it did. Option A (`pino-http`) can replace 1 later without
touching 2.
