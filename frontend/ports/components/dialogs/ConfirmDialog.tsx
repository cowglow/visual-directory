import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./confirm-dialog.css";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// A small centered card over a dimmed backdrop — deliberately a different
// pattern from Panel's full-screen chrome, so a destructive confirmation
// never reads as just another screen to navigate through. Renders its own
// scrim, so callers return this in place of their normal Panel-wrapped
// content rather than nesting it inside one.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="confirm-scrim" onClick={onCancel}>
      <div
        className="confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div id="confirm-dialog-title" className="confirm-title">
          {title}
        </div>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-default" onClick={onCancel}>
            {cancelLabel ?? t.common.cancel}
          </button>
          <button type="button" className="confirm-destructive" onClick={onConfirm}>
            {confirmLabel ?? t.common.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
