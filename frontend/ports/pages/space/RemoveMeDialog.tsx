import { useState } from "react";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./space-pages.css";

interface RemoveMeDialogProps {
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

// TASK.md section 3's "deletion fairness messaging" - the fairness copy
// appears here too (not just on LocationForm), since removing your whole
// account is the same "please don't do this at the last minute, but you
// always can" moment as removing just your pin.
export default function RemoveMeDialog({ onConfirm, onClose }: RemoveMeDialogProps) {
  const { t } = useTranslation();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setRemoving(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError(t.spaceApp.removeMeFailed);
      setRemoving(false);
    }
  };

  return (
    <div className="space-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="space-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-me-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="remove-me-title">{t.spaceApp.removeMeConfirmTitle}</h2>
        <p>{t.spaceApp.removeMeConfirmMessage}</p>
        <p className="space-fairness-note">{t.spaceApp.fairness}</p>
        {error ? <p className="space-error">{error}</p> : null}
        <div className="space-placement-actions">
          <button type="button" className="btn" onClick={onClose} disabled={removing}>
            {t.common.cancel}
          </button>
          <button type="button" className="btn" onClick={handleConfirm} disabled={removing}>
            {removing ? "…" : t.spaceApp.removeMeConfirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}
