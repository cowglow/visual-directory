# Dev HTTPS

`pnpm dev` (and its alias `pnpm dev:https`, kept as its own script name since
that's the literal thing this repo's setup instructions look for) already
serves the Vite dev server over HTTPS by default - this predates the
Halloween map work, see `vite.config.ts` and `scripts/dev-cert-ensure.sh`.
This doc explains why HTTPS is set up the way it is and, specifically, how to
get a phone on the same Wi-Fi to trust it - that's the part that wasn't
already covered.

## Why HTTPS at all, for local dev

`http://localhost` is already a
[secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
in every browser, so on the machine actually running `pnpm dev`, HTTPS buys
nothing - geolocation, service workers, etc. all already work over plain
`http://localhost:3000`.

It matters for **testing from a phone over the LAN** (`pnpm dev` already runs
`vite --host`, so a phone on the same Wi-Fi can reach
`https://<your-laptop's-LAN-IP>:3000`): that origin is not `localhost`, so
without a valid HTTPS certificate the phone's browser treats it as an
insecure context and geolocation ("use my location" when placing a pin),
service worker registration, and IndexedDB-backed offline caching will
either refuse to work or behave differently than production.

## How the existing setup works

`scripts/dev-cert-ensure.sh` runs automatically before `pnpm dev` (via the
`predev` npm-lifecycle script) and:

1. If [`mkcert`](https://github.com/FiloSottile/mkcert) is installed, it
   generates a certificate in `cert/` (git-ignored - certs and keys are never
   committed) covering `localhost`, `127.0.0.1`, `::1`, **and your machine's
   current LAN IP** (detected automatically; re-checked and regenerated if
   your IP changes between sessions, e.g. after reconnecting to Wi-Fi).
2. `mkcert -install` registers mkcert's local CA in your OS/browser trust
   stores, so the cert Chrome/Safari sees on your laptop is already fully
   trusted - no click-through warning.
3. If `mkcert` isn't installed, it falls back to
   `@vitejs/plugin-basic-ssl`'s ephemeral self-signed certificate (still
   HTTPS, but with a browser warning you have to click through, and a new
   untrusted cert every restart - not worth using deliberately, but it means
   nothing breaks if `mkcert` isn't around).

Install mkcert once, if you haven't:

```bash
brew install mkcert   # macOS
mkcert -install
```

Then `pnpm dev` (or `pnpm dev:up` for backend + frontend together) as usual.

## Trusting the cert on a phone

Your phone doesn't share your laptop's OS trust store, so it needs mkcert's
root CA installed as a trusted profile too - a real certificate, but its
private key never leaves your laptop, so this is safe to do once and reuse:

1. On your laptop, find the CA file: `mkcert -CAROOT` prints a directory;
   the file you need is `rootCA.pem` inside it.
2. Get that file onto the phone - AirDrop, a temporary local HTTP server
   (`cd "$(mkcert -CAROOT)" && python3 -m http.server 8000`, then browse to
   `http://<laptop-LAN-IP>:8000/rootCA.pem` from the phone), or email it to
   yourself. Don't publish it anywhere public - anyone who has it could mint
   certificates your phone would trust for any hostname.
3. **iOS**: opening the file prompts to install a profile
   (Settings → General → VPN & Device Management). After installing it, you
   still need to *enable full trust* for it: Settings → General → About →
   Certificate Trust Settings → toggle the mkcert root on.
4. **Android**: Settings → Security → Encryption & credentials → Install a
   certificate → CA certificate, then pick the file. Some OEM skins move
   this menu; search your phone's Settings app for "CA certificate" if it's
   not there.
5. Visit `https://<laptop-LAN-IP>:3000` from the phone's browser. It should
   load with no warning. If your laptop's IP changed since you last ran
   `pnpm dev`, the predev script will have regenerated the cert for the new
   IP automatically - just re-run `pnpm dev`.

To stop trusting it later (e.g. before handing off/wiping the phone), remove
the installed profile/certificate from the same Settings screen.

## Why the API isn't proxied through the Vite dev server

TASK.md's dev-HTTPS section suggests proxying `/api` through Vite so cookies
and CORS "just work" on the same origin. This app doesn't use cookies for
auth anywhere (directory or Spaces) - both sign-ins hand back a bearer JWT
that the frontend stores and sends as an `Authorization` header (see
`infrastructure/api/` and `frontend/infrastructure/api/space-api-client.ts`),
so there's no cookie/CORS interaction to fix. Cross-origin requests to the
API already work via its existing `CLIENT_ORIGIN`-based CORS allowlist
(`backend/src/ports/http/app.ts`). Proxying was considered and skipped as
unneeded complexity for this app's actual auth model - noted here rather
than silently dropped.
