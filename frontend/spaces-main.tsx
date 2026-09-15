import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import SpaceApp from "ports/pages/space/SpaceApp.tsx";
import "@sakun/system.css";

// A separate build entry from frontend/main.tsx (see spaces/index.html and
// vite.config.ts's rollupOptions.input), served at /visual-directory/spaces/ -
// its own real, bookmarkable/shareable path, matching how dist/storybook/
// already works in this repo (see .github/workflows/deploy.yml). This is the
// whole page, not a route inside the directory app, so it mounts SpaceApp
// directly at the root of its own HashRouter rather than under a "/s/*"
// prefix - the directory app (frontend/main.tsx) never loads this bundle at
// all, and vice versa.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <SpaceApp />
    </HashRouter>
  </React.StrictMode>,
);
