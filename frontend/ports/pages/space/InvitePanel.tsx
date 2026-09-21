import { FormEvent, useEffect, useState } from "react";
import { spaceApiFetch, SpaceApiError } from "infrastructure/api/space-api-client.ts";
import type { SpaceRole } from "domain/space/space.types.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./space-pages.css";

type InviteListItem = {
  id: string;
  email: string;
  role: SpaceRole;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
};

function inviteStatus(invite: InviteListItem, t: ReturnType<typeof useTranslation>["t"]): string {
  if (invite.revokedAt) return t.spaceApp.inviteStatusRevoked;
  if (invite.usedAt) return t.spaceApp.inviteStatusAccepted;
  if (new Date(invite.expiresAt) < new Date()) return t.spaceApp.inviteStatusExpired;
  return t.spaceApp.inviteStatusPending;
}

// Only ever shown to a `participant` (TASK.md section 2: only a participant
// can invite) - the caller (MapHomePage) already gates on role before
// rendering this, and the backend re-checks it on every request regardless.
export default function InvitePanel({ spaceSlug }: { spaceSlug: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SpaceRole>("visitor");
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteListItem[] | null>(null);

  const loadInvites = () => {
    spaceApiFetch<{ invites: InviteListItem[] }>(spaceSlug, `/spaces/${spaceSlug}/invites`)
      .then((result) => setInvites(result.invites))
      .catch(() => setInvites([]));
  };

  useEffect(loadInvites, [spaceSlug]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("pending");
    setError(null);
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/invites`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setStatus("sent");
      setEmail("");
      loadInvites();
    } catch (err) {
      setStatus("failed");
      setError(err instanceof SpaceApiError ? err.message : t.spaceApp.inviteFailed);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/invites/${id}`, { method: "DELETE" });
      loadInvites();
    } catch {
      setError(t.spaceApp.revokeInviteFailed);
    }
  };

  return (
    <div className="space-invite-panel">
      <h3>{t.spaceApp.inviteTitle}</h3>
      <form onSubmit={handleSubmit}>
        <div className="space-field-row">
          <div className="space-field">
            <label htmlFor="invite-email">{t.spaceApp.inviteEmail}</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-field">
            <label htmlFor="invite-role">{t.spaceApp.inviteRole}</label>
            <select id="invite-role" value={role} onChange={(event) => setRole(event.target.value as SpaceRole)}>
              <option value="visitor">{t.spaceApp.roleVisitor}</option>
              <option value="participant">{t.spaceApp.roleParticipant}</option>
            </select>
          </div>
        </div>
        <button type="submit" className="btn" disabled={status === "pending"}>
          {t.spaceApp.sendInvite}
        </button>
        {status === "sent" ? <p className="space-status">{t.spaceApp.inviteSent}</p> : null}
        {status === "failed" ? <p className="space-error">{error}</p> : null}
      </form>

      <h4>{t.spaceApp.pendingInvitesTitle}</h4>
      {invites === null ? (
        <p>{t.spaceApp.loading}</p>
      ) : invites.length === 0 ? (
        <p>{t.spaceApp.noPendingInvites}</p>
      ) : (
        <ul className="space-invite-list">
          {invites.map((invite) => (
            <li key={invite.id} className="space-invite-item">
              <span>
                {invite.email} <span className="space-badge">{inviteStatus(invite, t)}</span>
              </span>
              {!invite.usedAt && !invite.revokedAt ? (
                <button type="button" className="btn" onClick={() => handleRevoke(invite.id)}>
                  {t.spaceApp.revokeInvite}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
