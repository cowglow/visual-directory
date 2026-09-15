import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import Dialogs from "ports/components/dialogs/Dialogs.tsx";
import AuthGate from "ports/components/auth/AuthGate.tsx";
import { ContextProviders } from "ports/context/context-providers.tsx";
import "@sakun/system.css";
// import { installGeoSim } from "infrastructure/geo-simulation/geo-simulation.ts";

if (import.meta.env.DEV) {
  // installGeoSim(1000);
}

// The opt-in Spaces feature lives at /visual-directory/spaces/ instead, its
// own separate build entry (see frontend/spaces-main.tsx, spaces/index.html,
// vite.config.ts) - this bundle never renders it and has no router of its own.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ContextProviders>
      <AuthGate>
        <App />
        <Dialogs />
      </AuthGate>
    </ContextProviders>
  </React.StrictMode>,
);
