import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import Dialogs from "ports/components/dialogs/Dialogs.tsx";
import AuthGate from "ports/components/auth/AuthGate.tsx";
import { ContextProviders } from "ports/context/context-providers.tsx";
import "./styles/tokens.css";
// import { installGeoSim } from "infrastructure/geo-simulation/geo-simulation.ts";

if (import.meta.env.DEV) {
  // installGeoSim(1000);
}

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
