import { useDispatch } from "infrastructure/redux/hooks.ts";
import { closeWindow } from "infrastructure/redux/windows/windows.slice.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import DialogWindow from "ports/components/dialogs/DialogWindow.tsx";
import PrivacyNotice from "ports/components/privacy/PrivacyNotice.tsx";

export default function PrivacyDialog() {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return (
    <DialogWindow title={t.privacy.title} onClose={() => dispatch(closeWindow("PRIVACY_DIALOG"))}>
      <PrivacyNotice />
    </DialogWindow>
  );
}
