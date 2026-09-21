import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import "./space-pages.css";

const LABEL_MAX = 60;
const NOTE_MAX = 500;

interface LocationFormProps {
  spaceSlug: string;
  initialLabel?: string;
  initialNote?: string;
  onSubmit: (input: { label: string; note: string }) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
}

// TASK.md section 9: "label and note form with counters and consent
// checkbox." The legal GDPR consent record (consentAt/noticeVersion) is
// captured once, on the backend, when an invite is accepted
// (InviteAcceptPage.tsx) - a participant can't reach this form without
// already having consented. This form's own checkbox is a second,
// UI-only reaffirmation specific to the data being published *right now*
// (this pin's exact label/note/location) - required to enable Save, but
// it doesn't write a second backend record.
export default function LocationForm({
  spaceSlug,
  initialLabel = "",
  initialNote = "",
  onSubmit,
  onCancel,
  submitting,
  error,
}: LocationFormProps) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(initialLabel);
  const [note, setNote] = useState(initialNote);
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ label, note });
  };

  return (
    <form onSubmit={handleSubmit} className="space-location-form">
      <div className="space-field">
        <label htmlFor="pin-label">{t.spaceApp.labelField}</label>
        <input
          id="pin-label"
          type="text"
          value={label}
          maxLength={LABEL_MAX}
          placeholder={t.spaceApp.labelPlaceholder}
          onChange={(event) => setLabel(event.target.value)}
          required
        />
        <div className="space-field-hint">
          {t.spaceApp.labelHint} <span>{t.spaceApp.labelCounter(label.length, LABEL_MAX)}</span>
        </div>
      </div>

      <div className="space-field">
        <label htmlFor="pin-note">{t.spaceApp.noteField}</label>
        <textarea
          id="pin-note"
          value={note}
          maxLength={NOTE_MAX}
          rows={4}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="space-field-hint">
          {t.spaceApp.noteHint} <span>{t.spaceApp.noteCounter(note.length, NOTE_MAX)}</span>
        </div>
      </div>

      <p className="space-field-hint">{t.spaceApp.minimizationHint}</p>

      <p>
        <Link to={spacePaths.privacy(spaceSlug)} target="_blank" rel="noopener noreferrer">
          {t.spaceApp.privacyLink}
        </Link>
      </p>
      <label className="space-field-checkbox">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required />
        {t.spaceApp.consentLabel(t.spaceApp.privacyLink)}
      </label>

      <p className="space-fairness-note">{t.spaceApp.fairness}</p>

      {error ? <p className="space-error">{error}</p> : null}

      <div className="space-placement-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          {t.common.cancel}
        </button>
        <button type="submit" className="btn" disabled={submitting || !confirmed}>
          {submitting ? "…" : t.spaceApp.save}
        </button>
      </div>
    </form>
  );
}
