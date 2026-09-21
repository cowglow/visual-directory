import { useState } from "react";
import { Marker, Popup } from "@vis.gl/react-maplibre";
import SpaceMap from "ports/pages/space/SpaceMap.tsx";
import SpacePinIcon from "ports/pages/space/SpacePinIcon.tsx";
import type { SpaceLocation } from "domain/space/space.types.ts";
import { MECKENHAUSEN_CENTER } from "domain/space/meckenhausen-boundary.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

interface LocationsMapViewProps {
  locations: SpaceLocation[];
  ownParticipantId: string | null;
}

// Read-only view of every participant's pin. Popups render `label`/`note` as
// plain React children (never setHTML/dangerouslySetInnerHTML/innerHTML) -
// React escapes text content by construction, so a label or note containing
// "<script>" or an event handler attribute renders as inert text (TASK.md
// section 8's XSS requirement; see LocationsMapView.test.tsx).
export default function LocationsMapView({ locations, ownParticipantId }: LocationsMapViewProps) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);

  const initial = locations[0]
    ? { longitude: locations[0].lng, latitude: locations[0].lat, zoom: 16 }
    : { longitude: MECKENHAUSEN_CENTER.lng, latitude: MECKENHAUSEN_CENTER.lat, zoom: 15 };

  return (
    <div className="space-map-view">
      <SpaceMap viewState={initial} ariaLabel={t.spaceApp.mapView}>
        {locations.map((location) => (
          <Marker
            key={location.id}
            longitude={location.lng}
            latitude={location.lat}
            anchor="bottom"
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              setOpenId((current) => (current === location.id ? null : location.id));
            }}
          >
            <button
              type="button"
              className="space-pin-button"
              aria-label={location.label}
              onClick={(event) => {
                event.stopPropagation();
                setOpenId((current) => (current === location.id ? null : location.id));
              }}
            >
              <SpacePinIcon variant={location.participantId === ownParticipantId ? "own" : "participant"} />
            </button>
          </Marker>
        ))}
        {locations
          .filter((location) => location.id === openId)
          .map((location) => (
            <Popup
              key={location.id}
              longitude={location.lng}
              latitude={location.lat}
              anchor="bottom"
              offset={28}
              onClose={() => setOpenId(null)}
            >
              <strong>{location.label}</strong>
              {location.note ? <p className="space-popup-note">{location.note}</p> : null}
            </Popup>
          ))}
      </SpaceMap>
    </div>
  );
}
