import { defineConfig } from "vite";
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

// https://vitejs.dev/config/
export default defineConfig({
  base: "/visual-directory",
  plugins: [
    tsconfigPaths(),
    react(),
    checker({ typescript: true }),
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
});
