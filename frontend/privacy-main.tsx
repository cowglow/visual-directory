import React from "react";
import ReactDOM from "react-dom/client";
import { I18nContextProvider } from "ports/context/i18n/i18n.provider.tsx";
import PrivacyPage from "ports/pages/privacy/PrivacyPage.tsx";
import "./styles/tokens.css";

// A deliberately separate entry point (see privacy.html, vite.config.ts) —
// this never pulls in the Redux store, sagas, API client, or MapLibre, so
// the privacy page's own bundle stays tiny and never makes a network call,
// consistent with it needing no authentication and no backend at all.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nContextProvider>
      <PrivacyPage />
    </I18nContextProvider>
  </React.StrictMode>,
);
