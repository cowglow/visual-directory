import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SpaceMap from "ports/pages/space/SpaceMap.tsx";
import SpacePinIcon from "ports/pages/space/SpacePinIcon.tsx";
import { isInsideMeckenhausenBoundary } from "domain/space/point-in-polygon.ts";
import { MECKENHAUSEN_CENTER } from "domain/space/meckenhausen-boundary.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./space-pages.css";

interface PinPlacementProps {
  initial?: { lat: number; lng: number };
  onConfirm: (coords: { lat: number; lng: number }) => void;
  onCancel: () => void;
}

const DEFAULT_ZOOM = 17;
const NUDGE_METERS = 2;
const METERS_PER_DEGREE_LAT = 111_320;

function nudgeDelta(lat: number): { dLat: number; dLng: number } {
  const dLat = NUDGE_METERS / METERS_PER_DEGREE_LAT;
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);
  const dLng = NUDGE_METERS / metersPerDegreeLng;
  return { dLat, dLng };
}

function formatCoordinate(value: number): string {
  return value.toFixed(5);
}

// TASK.md section 5: mouse (drag the map under the marker), touch (pan/pinch,
// see SpaceMap's touch-action), and keyboard (MapLibre's built-in arrow-key
// pan / +/- zoom on the focused map, plus these explicit nudge buttons and a
// Confirm button reachable by Tab) must all work equally. The marker itself
// never moves on screen - it's pinned at the container's visual center via
// CSS, and it's the *map* that moves underneath it, so the candidate
// coordinate is always just "whatever the map's current center is."
export default function PinPlacement({ initial, onConfirm, onCancel }: PinPlacementProps) {
  const { t } = useTranslation();
  const start = initial ?? MECKENHAUSEN_CENTER;
  const [viewState, setViewState] = useState({ longitude: start.lng, latitude: start.lat, zoom: DEFAULT_ZOOM });
  const [announced, setAnnounced] = useState({ lat: start.lat, lng: start.lng });
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const inside = useMemo(() => isInsideMeckenhausenBoundary(viewState.latitude, viewState.longitude), [viewState]);
  const announcedInside = useMemo(
    () => isInsideMeckenhausenBoundary(announced.lat, announced.lng),
    [announced],
  );

  // Announce on move-end / nudge rather than on every intermediate drag frame -
  // a screen reader re-reading the live region on every pixel of a drag would
  // be unusable noise.
  const announce = useCallback((lat: number, lng: number) => {
    setAnnounced({ lat, lng });
  }, []);

  const nudge = useCallback(
    (direction: "N" | "S" | "E" | "W") => {
      const { dLat, dLng } = nudgeDelta(viewState.latitude);
      const next = {
        ...viewState,
        latitude: viewState.latitude + (direction === "N" ? dLat : direction === "S" ? -dLat : 0),
        longitude: viewState.longitude + (direction === "E" ? dLng : direction === "W" ? -dLng : 0),
      };
      setViewState(next);
      announce(next.latitude, next.longitude);
    },
    [viewState, announce],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleUseMyLocation = () => {
    setLocateError(null);
    if (!navigator.geolocation) {
      setLocateError(t.spaceApp.locateFailed);
      setViewState((v) => ({ ...v, latitude: MECKENHAUSEN_CENTER.lat, longitude: MECKENHAUSEN_CENTER.lng }));
      announce(MECKENHAUSEN_CENTER.lat, MECKENHAUSEN_CENTER.lng);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setViewState((v) => ({ ...v, ...next }));
        announce(next.latitude, next.longitude);
      },
      () => {
        // Denied or unavailable falls back to the village center (TASK.md
        // section 1), never silently stays wherever the map already was -
        // that would look like the button silently did nothing.
        setLocating(false);
        setLocateError(t.spaceApp.locateFailed);
        setViewState((v) => ({ ...v, latitude: MECKENHAUSEN_CENTER.lat, longitude: MECKENHAUSEN_CENTER.lng }));
        announce(MECKENHAUSEN_CENTER.lat, MECKENHAUSEN_CENTER.lng);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="space-placement" ref={containerRef}>
      <div className="space-placement-map">
        <SpaceMap
          viewState={viewState}
          onMove={setViewState}
          ariaLabel={t.spaceApp.placementInstructions}
        />
        <div className="space-placement-center-marker" aria-hidden>
          <SpacePinIcon variant="center" color={inside ? "#2e9e4f" : "#e5484d"} size={40} />
        </div>
      </div>

      <p className="space-placement-instructions">{t.spaceApp.placementInstructions}</p>

      <div aria-live="polite" className="space-sr-live">
        {t.spaceApp.positionAnnouncement(formatCoordinate(announced.lat), formatCoordinate(announced.lng), announcedInside)}
      </div>
      <p className={announcedInside ? "space-status" : "space-error"}>
        {announcedInside ? t.spaceApp.statusInside : t.spaceApp.statusOutside}
      </p>

      <div className="space-nudge-grid">
        <span />
        <button type="button" className="btn" onClick={() => nudge("N")} aria-label={t.spaceApp.nudgeNorth}>
          ▲
        </button>
        <span />
        <button type="button" className="btn" onClick={() => nudge("W")} aria-label={t.spaceApp.nudgeWest}>
          ◀
        </button>
        <span />
        <button type="button" className="btn" onClick={() => nudge("E")} aria-label={t.spaceApp.nudgeEast}>
          ▶
        </button>
        <span />
        <button type="button" className="btn" onClick={() => nudge("S")} aria-label={t.spaceApp.nudgeSouth}>
          ▼
        </button>
        <span />
      </div>

      <button type="button" className="btn" onClick={handleUseMyLocation} disabled={locating}>
        {locating ? t.spaceApp.locatingMe : t.spaceApp.useMyLocation}
      </button>
      {locateError ? <p className="space-error">{locateError}</p> : null}

      <div className="space-placement-actions">
        <button type="button" className="btn" onClick={onCancel}>
          {t.spaceApp.cancelPlacement}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!inside}
          onClick={() => onConfirm({ lat: viewState.latitude, lng: viewState.longitude })}
        >
          {t.spaceApp.confirmLocation}
        </button>
      </div>
    </div>
  );
}
