// Registers public/spaces/sw.js, scoped to this app's own path only - see
// that file for the full caching strategy and why it's hand-rolled instead of
// vite-plugin-pwa. A no-op outside a secure context (plain http://, anything
// but localhost) since navigator.serviceWorker doesn't exist there - see
// docs/DEV-HTTPS.md for why `pnpm dev` is HTTPS by default.
export function registerSpaceServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  const scope = `${import.meta.env.BASE_URL}spaces/`;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${scope}sw.js`, { scope }).catch((err) => {
      console.error("[sw] registration failed:", err);
    });
  });
}
