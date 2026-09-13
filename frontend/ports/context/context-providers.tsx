import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { AppStore, setupStore } from "infrastructure/redux/store.ts";
import { loadWindowsState } from "infrastructure/redux/windows/windows-storage.ts";
import { setUnauthorizedHandler } from "infrastructure/api/api-client.ts";
import { sessionExpired } from "infrastructure/redux/auth/auth.slice.ts";
import { TileServerContextProvider } from "ports/context/tile-server/tile-server.provider.tsx";
import { I18nContextProvider } from "ports/context/i18n/i18n.provider.tsx";

const persistedWindows = loadWindowsState();
const reduxStore: AppStore = setupStore(persistedWindows ? { windows: persistedWindows } : {});

// The session's token is now short-lived (see backend/src/infrastructure/auth/
// jwt-token-signer.ts), so it can expire while the app is open, not just between
// visits. Any API call that gets a 401 should drop straight back to "please sign
// in" instead of leaving the UI stuck on a stale authenticated view.
setUnauthorizedHandler(() => reduxStore.dispatch(sessionExpired()));

export const ContextProviders = ({ children }: PropsWithChildren) => (
  <Provider store={reduxStore}>
    <I18nContextProvider>
      <TileServerContextProvider>
        <>{children}</>
      </TileServerContextProvider>
    </I18nContextProvider>
  </Provider>
);