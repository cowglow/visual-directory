import { FormEvent, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { setSpaceSession, spaceApiFetch, SpaceApiError, type SpaceSession } from "infrastructure/api/space-api-client.ts";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./space-pages.css";

// TASK.md section 2: accepting an invite is the only way a SpaceParticipant
// row is ever created - there's no public self-serve sign-up. The consent
// checkbox here is what sets consentAt/noticeVersion on the backend
// (application/space/space.use-cases.ts's acceptInvite), the actual GDPR
// consent record (section 3) - not the reaffirming checkbox on
// LocationForm.tsx, which is UI-only and doesn't touch that record again.
export default function InviteAcceptPage() {
  const { spaceSlug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = searchParams.get("token") ?? "";

  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!consent) {
      setError(t.spaceApp.acceptInviteConsentRequired);
      return;
    }
    setStatus("pending");
    setError(null);
    try {
      const result = await spaceApiFetch<{ token: string; participant: SpaceSession }>(
        spaceSlug,
        `/spaces/${spaceSlug}/invites/${token}/accept`,
        { method: "POST", body: JSON.stringify({ consent: true }) },
      );
      const session = {
        token: result.token,
        participantId: result.participant.participantId,
        email: result.participant.email,
        role: result.participant.role,
      };
      setSpaceSession(spaceSlug, session);
      navigate(spacePaths.home(spaceSlug), { replace: true });
    } catch (err) {
      setStatus("failed");
      setError(err instanceof SpaceApiError ? err.message : t.spaceApp.acceptInviteFailed);
    }
  };

  if (!token) {
    return (
      <div className="space-page window">
        <p className="space-error">{t.spaceApp.acceptInviteFailed}</p>
      </div>
    );
  }

  return (
    <div className="space-page window">
      <h1>{t.spaceApp.acceptInviteTitle}</h1>
      <p>
        <a href={spacePaths.privacy(spaceSlug)} target="_blank" rel="noopener noreferrer">
          {t.spaceApp.privacyLink}
        </a>
      </p>
      <form onSubmit={handleSubmit}>
        <label className="space-field-checkbox">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
          {t.spaceApp.acceptInviteConsent()}
        </label>
        <button type="submit" className="btn" disabled={status === "pending"}>
          {t.spaceApp.acceptInviteSubmit}
        </button>
        {error ? <p className="space-error">{error}</p> : null}
      </form>
    </div>
  );
}
