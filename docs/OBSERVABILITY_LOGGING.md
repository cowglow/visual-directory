# Adding request logging (idea, not yet implemented)

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

## Option B (zero-dependency, do this now): hand-rolled middleware + Caddy access log

**1. Minimal request-logging middleware**, same `app.use()` position as above, no new
package — just `console.log` plus `res.on("finish", ...)`:

```ts
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});
```

Gets every request's method/path/status/duration into `docker logs
visual-directory-api` — including successful ones — with no dependency and no
formatting/rotation niceties. Good enough to answer "did this request even reach the
API, and what did it return" during the next incident like this one.

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
