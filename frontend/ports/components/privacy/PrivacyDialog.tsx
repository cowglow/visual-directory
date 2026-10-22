import { useDispatch } from "infrastructure/redux/hooks.ts";
import { closeWindow } from "infrastructure/redux/windows/windows.slice.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import Panel from "ports/components/panel/Panel.tsx";
import PrivacyNotice from "ports/components/privacy/PrivacyNotice.tsx";

export default function PrivacyDialog({ z }: { z?: number }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return (
    <Panel title={t.privacy.title} onClose={() => dispatch(closeWindow("PRIVACY_DIALOG"))} z={z}>
      <PrivacyNotice />
    </Panel>
  );
}
