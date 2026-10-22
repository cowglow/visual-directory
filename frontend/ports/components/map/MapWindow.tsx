import Panel from "ports/components/panel/Panel.tsx";
import BottomNav from "ports/components/nav/BottomNav.tsx";
import MembersMap from "ports/components/map/MembersMap.tsx";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

// The map is the home screen — nowhere to go "back" to, so Panel gets no
// onClose at all (see Panel.tsx's own doc comment on that prop).
export default function MapWindow({ z }: { z?: number }) {
  const { t } = useTranslation();

  return (
    <Panel title={t.mapWindow.title} padded={false} scroll={false} footer={<BottomNav active="map" />} z={z}>
      <MembersMap />
    </Panel>
  );
}
