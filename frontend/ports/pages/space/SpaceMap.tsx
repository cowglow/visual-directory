import { ReactNode, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Map as MapLibreMap, type ViewState } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  PMTILES_URL,
  placeholderStyle,
  pmtilesStyle,
  registerPmtilesProtocol,
} from "infrastructure/tile-server/space-map-style.ts";
import { MECKENHAUSEN_MAX_BOUNDS } from "domain/space/meckenhausen-boundary.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

registerPmtilesProtocol();

// Section 5: "set touch-action correctly" so a finger drag/pinch on the map
// pans/zooms it instead of scrolling the page underneath it.
const MAP_CONTAINER_STYLE: CSSProperties = { width: "100%", height: "100%", touchAction: "none" };

function usePmtilesAvailability(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(PMTILES_URL, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) setAvailable(res.ok);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}

interface SpaceMapProps {
  viewState: Pick<ViewState, "longitude" | "latitude" | "zoom">;
  onMove?: (viewState: Pick<ViewState, "longitude" | "latitude" | "zoom">) => void;
  interactive?: boolean;
  children?: ReactNode;
  ariaLabel?: string;
}

// The one self-hosted map wrapper Spaces uses everywhere (read-only map view,
// pin placement) - registers the pmtiles protocol once, picks the real style
// once meckenhausen-v1.pmtiles is available or the placeholder otherwise (see
// space-map-style.ts), and always constrains panning/zooming to the
// Meckenhausen bbox (TASK.md section 4: "Set maxBounds on the map").
export default function SpaceMap({ viewState, onMove, interactive = true, children, ariaLabel }: SpaceMapProps) {
  const { t, language } = useTranslation();
  const pmtilesAvailable = usePmtilesAvailability();
  const lang = language === "de" ? "de" : "en";

  const mapStyle = useMemo(
    () => (pmtilesAvailable ? pmtilesStyle(lang) : placeholderStyle()),
    [pmtilesAvailable, lang],
  );

  // prefers-reduced-motion (TASK.md section 5): never animate the camera -
  // every place this map's view changes goes through onMove with `jumpTo`-
  // equivalent instant updates (react-maplibre's controlled viewState), and
  // no flyTo/easeTo call exists anywhere in this feature.
  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <MapLibreMap
      mapStyle={mapStyle}
      longitude={viewState.longitude}
      latitude={viewState.latitude}
      zoom={viewState.zoom}
      minZoom={13}
      maxZoom={19}
      maxBounds={MECKENHAUSEN_MAX_BOUNDS}
      dragPan={interactive}
      dragRotate={false}
      touchZoomRotate={interactive}
      scrollZoom={interactive}
      doubleClickZoom={interactive}
      keyboard={interactive}
      attributionControl={{ compact: false, customAttribution: t.spaceApp.attribution }}
      style={MAP_CONTAINER_STYLE}
      aria-label={ariaLabel}
      onMove={onMove ? (event) => onMove(event.viewState) : undefined}
      // No transition/duration anywhere - matches prefersReducedMotion by
      // construction rather than branching on it, since this map never
      // animates in the first place (see the comment above).
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
    >
      {children}
    </MapLibreMap>
  );
}
