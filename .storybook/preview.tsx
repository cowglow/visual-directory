import type { Decorator, Preview } from "@storybook/react";
import { Provider } from "react-redux";
import { Map as MapLibreMap } from "@vis.gl/react-maplibre";
import { setupStore } from "../frontend/infrastructure/redux/store.ts";
import { installGeoSim } from "../frontend/infrastructure/geo-simulation/geo-simulation.ts";
import { TileServerContext } from "../frontend/ports/context/tile-server/tile-server.context.ts";
import { baseMaps, mapStyleFor } from "../frontend/infrastructure/tile-server/base-maps.ts";
import { I18nContext } from "../frontend/ports/context/i18n/i18n.context.ts";
import { translations } from "../frontend/ports/i18n/translations/index.ts";
import { languages, languageLabels, type Language } from "../frontend/ports/i18n/language.ts";
import "@sakun/system.css";
import "maplibre-gl/dist/maplibre-gl.css";

// Desktop browsers rarely have a meaningful real geolocation reading, so stories
// that depend on it (Marker.OwnPosition) would otherwise be undemoable. This swaps
// in the same simulated-route shim used for local dev.
installGeoSim(1000);

const NUREMBERG = { longitude: 11.0767, latitude: 49.4521 };
const tileProviderNames = Object.keys(baseMaps) as (keyof typeof baseMaps)[];

const withAppProviders: Decorator = (Story, context) => (
  <Provider store={setupStore(context.parameters.reduxState ?? {})}>
    <Story />
  </Provider>
);

// Raster basemap config is stateless (unlike Leaflet's per-map tile-layer
// instances), so a story just needs the real record and the toolbar's pick.
const withTileServer: Decorator = (Story, context) => {
  const selectedBaseMap = (context.globals.tileProvider ?? tileProviderNames[0]) as string;
  return (
    <TileServerContext.Provider value={{ baseMaps, selectedBaseMap, setSelectedBaseMap: () => {} }}>
      <Story />
    </TileServerContext.Provider>
  );
};

// Stories tagged `parameters: { map: true }` render inside a real MapLibre map so
// `useMap()` / <Marker> / <Popup> resolve.
const withMap: Decorator = (Story, context) => {
  if (!context.parameters.map) return <Story />;
  const selectedBaseMap = (context.globals.tileProvider ??
    tileProviderNames[0]) as keyof typeof baseMaps;
  return (
    <MapLibreMap
      initialViewState={{ ...NUREMBERG, zoom: 8 }}
      mapStyle={mapStyleFor(baseMaps[selectedBaseMap])}
      style={{ height: "400px", width: "100%" }}
    >
      <Story />
    </MapLibreMap>
  );
};

const withI18n: Decorator = (Story, context) => {
  const language = (context.globals.language ?? "en") as Language;
  return (
    <I18nContext.Provider value={{ language, setLanguage: () => {}, t: translations[language] }}>
      <Story />
    </I18nContext.Provider>
  );
};

const preview: Preview = {
  decorators: [withAppProviders, withTileServer, withMap, withI18n],
  globalTypes: {
    tileProvider: {
      name: "Tile Provider",
      description: "Base map tile layer",
      defaultValue: tileProviderNames[0],
      toolbar: {
        icon: "photo",
        items: tileProviderNames as unknown as string[],
        title: "Tile Provider",
      },
    },
    language: {
      name: "Language",
      description: "UI translation language",
      defaultValue: "en",
      toolbar: {
        icon: "globe",
        items: languages.map((language) => ({ value: language, title: languageLabels[language] })),
        title: "Language",
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
