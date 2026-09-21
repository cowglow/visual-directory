import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";
import * as path from "node:path";
import * as fs from "node:fs";
import viteBasicSslPlugin from "@vitejs/plugin-basic-ssl";

// `pnpm dev`'s predev hook (scripts/dev-cert-ensure.sh) generates a
// locally-trusted certificate here via mkcert - no browser warning, and no
// permissions (geolocation, etc.) getting reset because the cert changed, the
// way vite-plugin-basic-ssl's ephemeral self-signed one does on every
// restart. Falls back to basic-ssl when the mkcert cert hasn't been
// generated (e.g. inside Docker, where there's no host browser to trust a
// local CA anyway).
const certDir = path.resolve(__dirname, "cert");
const certFile = path.join(certDir, "localhost.pem");
const keyFile = path.join(certDir, "localhost-key.pem");
const hasMkcertCert = fs.existsSync(certFile) && fs.existsSync(keyFile);

// TASK.md section 3: a strict CSP for the Spaces app specifically - "default-src
// 'self'; connect-src 'self'; img-src 'self' data: blob:; worker-src 'self'
// blob:. Tune only as MapLibre requires; document any relaxations." Injected
// only into spaces/index.html, not the main directory app's index.html: the
// directory's own map (ports/components/map/) intentionally hits external
// raster tile CDNs (infrastructure/tile-server/base-maps.ts), which this CSP
// would break, and TASK.md's "no third-party requests at runtime" scope is
// this feature, not the whole app.
//
// Relaxations beyond the literal baseline, and why each is needed:
// - `connect-src` also allows the API's own origin (VITE_API_URL) - it's a
//   different origin from this static site by design (see
//   ports/http/app.ts's CORS comment), so `'self'` alone would block every
//   sign-in/invite/pin request.
// - `style-src` adds `'unsafe-inline'` - React's `style={{...}}` prop (used
//   throughout this feature, e.g. SpaceMap.tsx) renders as an inline `style=`
//   attribute, which default-src/style-src blocks without it. MapLibre GL JS
//   also sets canvas cursor/transform styles inline internally.
// - `font-src 'self'` for this app's own bundled @sakun/system.css fonts.
// - `manifest-src 'self'` for the PWA manifest link.
// Not yet live-verified in a real browser's console for CSP violations (this
// session had no way to drive one) - re-check with devtools open once the
// real .pmtiles/glyph/sprite assets are in place (section 4's blockers),
// since those add `pmtiles://`-protocol fetches and font/sprite requests
// this policy hasn't been exercised against yet.
function spaceCspPlugin(apiOrigin: string): Plugin {
  const csp = [
    "default-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "img-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "manifest-src 'self'",
  ].join("; ");

  return {
    name: "space-csp",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (!ctx.path.includes("/spaces/")) return html;
        return html.replace(
          "</head>",
          `  <meta http-equiv="Content-Security-Policy" content="${csp}" />\n</head>`,
        );
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = env.VITE_API_URL ?? "http://localhost:4000";

  return {
    base: "/visual-directory",
    plugins: [
      tsconfigPaths(),
      react(),
      checker({ typescript: true }),
      spaceCspPlugin(apiOrigin),
      ...(hasMkcertCert ? [] : [viteBasicSslPlugin()]),
    ],
    server: {
      port: 3000,
      https: hasMkcertCert ? { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) } : undefined,
    },
    build: {
      // A second real HTML entry, not a route inside the main one - the opt-in
      // Spaces feature is served at /visual-directory/spaces/ as its own page
      // (frontend/spaces-main.tsx), the same pattern this repo already uses for
      // Storybook (dist/storybook/, built as a separate step - see
      // .github/workflows/deploy.yml). Rollup preserves each input's own
      // directory structure in dist/, so spaces/index.html lands at
      // dist/spaces/index.html.
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          spaces: path.resolve(__dirname, "spaces/index.html"),
        },
      },
    },
  };
});
