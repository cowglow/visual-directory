import { FormEvent, useEffect, useRef, useState } from "react";
import { closeWindow } from "infrastructure/redux/windows/windows.slice.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { inviteAccountRequested, resetInviteAccount } from "infrastructure/redux/auth/auth.slice.ts";
import type { Role } from "infrastructure/redux/auth/auth.slice.ts";
import { getInviteError, getInviteRequestId, getInviteStatus } from "infrastructure/redux/auth/auth.selectors.ts";
import { createRequestId } from "infrastructure/redux/request-id.ts";
import {
  getMemberMutationError,
  getMemberMutationRequestId,
  getMemberMutationStatus,
  getMembers,
} from "infrastructure/redux/member/member.selectors.ts";
import { addMemberRequested, resetMemberMutation } from "infrastructure/redux/member/member.slice.ts";
import { createMember } from "domain/member/member.factory.ts";
import Panel from "ports/components/panel/Panel.tsx";
import "./forms.css";

// Either invite links to a member picked from the existing list, or (once the
// "create a new member" checkbox is on) this form creates that member first
// and links to it - two separate API calls, not one atomic operation, so a
// failure on the second leaves an unlinked member behind rather than nothing
// at all (recoverable via Manage Accounts, not a dead end).
type Pending =
  | { phase: "member"; requestId: string; memberId: string }
  | { phase: "invite"; requestId: string };

export default function InviteForm({ z }: { z?: number }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const members = useSelector(getMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [memberId, setMemberId] = useState("");
  const [createNewMember, setCreateNewMember] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pending = useRef<Pending | null>(null);
  const inviteStatus = useSelector(getInviteStatus);
  const inviteRequestId = useSelector(getInviteRequestId);
  const inviteError = useSelector(getInviteError);
  const memberMutationStatus = useSelector(getMemberMutationStatus);
  const memberMutationRequestId = useSelector(getMemberMutationRequestId);
  const memberMutationError = useSelector(getMemberMutationError);

  const sent =
    pending.current?.phase === "invite" &&
    inviteRequestId === pending.current.requestId &&
    inviteStatus === "succeeded";

  useEffect(() => {
    const current = pending.current;
    if (!current) return;

    if (current.phase === "member") {
      if (memberMutationRequestId !== current.requestId) return;
      if (memberMutationStatus === "succeeded") {
        dispatch(resetMemberMutation());
        const requestId = createRequestId();
        pending.current = { phase: "invite", requestId };
        dispatch(inviteAccountRequested({ requestId, email, role, memberId: current.memberId }));
      } else if (memberMutationStatus === "failed") {
        pending.current = null;
        setSubmitting(false);
        alert(memberMutationError ?? t.inviteForm.createMemberFailed);
        dispatch(resetMemberMutation());
      }
      return;
    }

    if (inviteRequestId !== current.requestId) return;
    if (inviteStatus === "failed") {
      pending.current = null;
      setSubmitting(false);
      alert(inviteError ?? t.inviteForm.inviteFailed);
      dispatch(resetInviteAccount());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberMutationStatus, memberMutationRequestId, memberMutationError, inviteStatus, inviteRequestId, inviteError]);

  const sortedMembers = [...members].sort((a, b) =>
    `${a.name.lastName} ${a.name.firstName}`.localeCompare(`${b.name.lastName} ${b.name.firstName}`),
  );

  const handleClose = () => {
    dispatch(resetInviteAccount());
    dispatch(resetMemberMutation());
    dispatch(closeWindow("INVITE_DIALOG"));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    if (createNewMember) {
      const member = createMember(newFirstName, newLastName);
      const requestId = createRequestId();
      pending.current = { phase: "member", requestId, memberId: member.id };
      dispatch(addMemberRequested({ requestId, member }));
    } else {
      const requestId = createRequestId();
      pending.current = { phase: "invite", requestId };
      dispatch(inviteAccountRequested({ requestId, email, role, ...(memberId ? { memberId } : {}) }));
    }
  };

  const roleLabel = role === "leader" ? t.inviteForm.roleLeader : t.inviteForm.roleMember;

  return (
    <Panel title={t.inviteForm.title} onClose={handleClose} z={z}>
      {sent ? (
        <>
          <p>{t.inviteForm.invited(email, roleLabel)}</p>
          <div className="field-row field-stack">
            <button type="button" className="btn" onClick={handleClose}>
              {t.common.close}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field-stack">
            <label htmlFor="invite-email">{t.inviteForm.email}</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field-stack">
            <label htmlFor="invite-role">{t.inviteForm.role}</label>
            <select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              <option value="member">{t.inviteForm.roleMember}</option>
              <option value="leader">{t.inviteForm.roleLeader}</option>
            </select>
          </div>

          {createNewMember ? (
            <div className="field-row field-stack">
              <div className="field-stack">
                <label htmlFor="invite-new-first-name">{t.memberForm.firstName}</label>
                <input
                  id="invite-new-first-name"
                  type="text"
                  value={newFirstName}
                  onChange={(event) => setNewFirstName(event.target.value)}
                  required
                />
              </div>
              <div className="field-stack">
                <label htmlFor="invite-new-last-name">{t.memberForm.lastName}</label>
                <input
                  id="invite-new-last-name"
                  type="text"
                  value={newLastName}
                  onChange={(event) => setNewLastName(event.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="field-stack">
              <label htmlFor="invite-member">{t.inviteForm.linkToMember}</label>
              <select
                id="invite-member"
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
              >
                <option value="">{t.inviteForm.noMemberLink}</option>
                {sortedMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name.firstName} {member.name.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field-row field-stack">
            <input
              id="invite-create-new-member"
              type="checkbox"
              checked={createNewMember}
              onChange={(event) => setCreateNewMember(event.target.checked)}
            />
            <label htmlFor="invite-create-new-member">{t.inviteForm.createNewMember}</label>
          </div>

          <div className="field-row field-stack">
            <button type="submit" className="btn" disabled={submitting}>
              {t.inviteForm.sendInvite}
            </button>
            <button type="button" className="btn" onClick={handleClose}>
              {t.common.cancel}
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}
