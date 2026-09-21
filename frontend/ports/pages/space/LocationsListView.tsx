import type { SpaceLocation } from "domain/space/space.types.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

interface LocationsListViewProps {
  locations: SpaceLocation[];
  ownParticipantId: string | null;
}

// TASK.md section 1: "A map/form toggle replaces the old form-only flow and
// the 'participating houses' list" - this is that list's replacement: a
// plain, accessible, non-map fallback showing the same label/note data as
// the map's popups, rendered as ordinary text (React children, never
// innerHTML - see LocationsMapView.tsx's comment).
export default function LocationsListView({ locations, ownParticipantId }: LocationsListViewProps) {
  const { t } = useTranslation();

  if (locations.length === 0) {
    return <p>{t.spaceApp.noLocationsYet}</p>;
  }

  const sorted = [...locations].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <ul className="space-entry-list">
      {sorted.map((location) => (
        <li key={location.id} className="space-entry">
          <div>
            <div className="space-entry-address">
              {location.label}
              {location.participantId === ownParticipantId ? (
                <span className="space-badge">{t.spaceApp.myPinTitle}</span>
              ) : null}
            </div>
            {location.note ? <div className="space-entry-detail space-popup-note">{location.note}</div> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
