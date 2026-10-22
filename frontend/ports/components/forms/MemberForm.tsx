import { FormEvent, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { closeWindow, DialogPayload } from "infrastructure/redux/windows/windows.slice.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { getMemberById } from "infrastructure/redux/member/member.selectors.ts";
import {
  getMemberMutationError,
  getMemberMutationRequestId,
  getMemberMutationStatus,
} from "infrastructure/redux/member/member.selectors.ts";
import { isLeader } from "infrastructure/redux/auth/auth.selectors.ts";
import { getOrganizations } from "infrastructure/redux/organization/organization.selectors.ts";
import {
  addMemberRequested,
  removeMemberRequested,
  resetMemberMutation,
  updateMemberRequested,
} from "infrastructure/redux/member/member.slice.ts";
import { createRequestId } from "infrastructure/redux/request-id.ts";
import {
  assignOrganization,
  createMember,
  markComplete,
  markLostContact,
  reactivateMember,
  updateMemberAddress,
  updateMemberEmail,
  updateMemberTelephone,
} from "domain/member/member.factory.ts";
import type { Member, MemberAddress } from "domain/member/member.types.ts";
import Panel from "ports/components/panel/Panel.tsx";
import ConfirmDialog from "ports/components/dialogs/ConfirmDialog.tsx";
import "./forms.css";

interface MemberFormProps {
  payload: DialogPayload | null;
  z?: number;
}

export default function MemberForm({ payload, z }: MemberFormProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const organizations = useSelector(getOrganizations);
  const leader = useSelector(isLeader);
  const existingMember = useSelector((state) =>
    payload?.memberId ? getMemberById(state, payload.memberId) : undefined,
  );

  const isEditMode = Boolean(existingMember);
  const coordinates = existingMember?.address?.coordinates ?? payload?.coordinates;

  const [firstName, setFirstName] = useState(existingMember?.name.firstName ?? "");
  const [lastName, setLastName] = useState(existingMember?.name.lastName ?? "");
  const [street, setStreet] = useState(existingMember?.address?.street ?? "");
  const [number, setNumber] = useState(existingMember?.address?.number ?? "");
  const [zip, setZip] = useState(existingMember?.address?.zip?.toString() ?? "");
  const [city, setCity] = useState(existingMember?.address?.city ?? "");
  const [telephone, setTelephone] = useState(existingMember?.contact?.telephone ?? "");
  const [email, setEmail] = useState(existingMember?.contact?.email ?? "");
  const [organizationId, setOrganizationId] = useState(existingMember?.organizationId ?? "");
  const [lostContact, setLostContact] = useState(existingMember?.status.kind === "lost-contact");
  const [lastActiveDate, setLastActiveDate] = useState(
    existingMember?.status.kind === "lost-contact"
      ? existingMember.status.lastActiveDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);

  // Correlates a save/remove this form issued with the outcome the saga reports
  // back — see request-id.ts. Without it, this effect could react to some other
  // member's in-flight mutation (e.g. a marker being drag-moved elsewhere).
  const pendingRequest = useRef<{ id: string; kind: "save" | "remove" } | null>(null);
  const mutationStatus = useSelector(getMemberMutationStatus);
  const mutationRequestId = useSelector(getMemberMutationRequestId);
  const mutationError = useSelector(getMemberMutationError);

  useEffect(() => {
    const pending = pendingRequest.current;
    if (!pending || mutationRequestId !== pending.id) {
      return;
    }
    if (mutationStatus === "succeeded") {
      pendingRequest.current = null;
      dispatch(resetMemberMutation());
      if (pending.kind === "save" && !isEditMode && createAnother) {
        // Batch-add: stay open with a blank form instead of closing. Keeps
        // the organization sticky - adding several members to the same one
        // in a row is the common case - but clears everything else.
        setFirstName("");
        setLastName("");
        setStreet("");
        setNumber("");
        setZip("");
        setCity("");
        setTelephone("");
        setEmail("");
        setLostContact(false);
        setLastActiveDate(new Date().toISOString().slice(0, 10));
      } else {
        dispatch(closeWindow("MEMBER_DIALOG"));
      }
    } else if (mutationStatus === "failed") {
      pendingRequest.current = null;
      alert(mutationError ?? (pending.kind === "remove" ? t.memberForm.removeFailed : t.memberForm.saveFailed));
      dispatch(resetMemberMutation());
    }
  }, [mutationStatus, mutationRequestId, mutationError, isEditMode, createAnother, dispatch, t]);

  const title = isEditMode ? t.memberForm.editTitle : t.memberForm.addTitle;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    let member: Member = existingMember ? { ...existingMember } : createMember(firstName, lastName);
    member = { ...member, name: { firstName, lastName } };

    // A member added without a map location (e.g. from the Organizations menu's
    // "Add Member") simply has no address — there's nothing to place on the map
    // until one is set, matching how domain/member/member.factory.ts's createMember
    // already leaves `address` unset by default.
    if (coordinates) {
      const address: MemberAddress = { street, number, zip: Number(zip), city, coordinates };
      member = updateMemberAddress(member, address);
    }
    member = updateMemberTelephone(member, telephone);
    member = updateMemberEmail(member, email);
    member = organizationId ? assignOrganization(member, organizationId) : member;
    member = lostContact ? markLostContact(member, lastActiveDate) : reactivateMember(member);
    // Saving the form means the details are filled in now.
    member = markComplete(member);

    const requestId = createRequestId();
    pendingRequest.current = { id: requestId, kind: "save" };
    dispatch(isEditMode ? updateMemberRequested({ requestId, member }) : addMemberRequested({ requestId, member }));
  };

  const handleRemove = () => {
    if (!existingMember) {
      dispatch(closeWindow("MEMBER_DIALOG"));
      return;
    }
    const requestId = createRequestId();
    pendingRequest.current = { id: requestId, kind: "remove" };
    dispatch(removeMemberRequested({ requestId, id: existingMember.id }));
  };

  if (confirmingRemove && existingMember) {
    return (
      <ConfirmDialog
        title={t.memberForm.confirmRemoveTitle}
        message={t.memberForm.confirmRemoveMessage(
          `${existingMember.name.firstName} ${existingMember.name.lastName}`,
        )}
        confirmLabel={t.common.remove}
        onConfirm={handleRemove}
        onCancel={() => setConfirmingRemove(false)}
      />
    );
  }

  return (
    <Panel title={title} onClose={() => dispatch(closeWindow("MEMBER_DIALOG"))} z={z}>
      <form onSubmit={handleSubmit}>
        <div className="field-row field-stack">
          <div className="field-stack">
            <label htmlFor="member-first-name">{t.memberForm.firstName}</label>
            <input
              id="member-first-name"
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
            />
          </div>
          <div className="field-stack">
            <label htmlFor="member-last-name">{t.memberForm.lastName}</label>
            <input
              id="member-last-name"
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
            />
          </div>
        </div>

        {coordinates ? (
          <>
            <div className="field-row field-stack">
              <div className="field-stack">
                <label htmlFor="member-street">{t.memberForm.street}</label>
                <input
                  id="member-street"
                  type="text"
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                />
              </div>
              <div className="field-stack">
                <label htmlFor="member-number">{t.memberForm.number}</label>
                <input
                  id="member-number"
                  type="text"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                />
              </div>
            </div>

            <div className="field-row field-stack">
              <div className="field-stack">
                <label htmlFor="member-zip">{t.memberForm.zip}</label>
                <input
                  id="member-zip"
                  type="text"
                  value={zip}
                  onChange={(event) => setZip(event.target.value)}
                />
              </div>
              <div className="field-stack">
                <label htmlFor="member-city">{t.memberForm.city}</label>
                <input
                  id="member-city"
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <p>{t.memberForm.noLocation}</p>
        )}

        <div className="field-stack">
          <label htmlFor="member-address">{t.memberForm.address}</label>
          <input
            id="member-address"
            type="text"
            placeholder={t.memberForm.addressComingSoon}
            disabled
          />
        </div>

        <div className="field-row field-stack">
          <div className="field-stack">
            <label htmlFor="member-telephone">{t.memberForm.telephone}</label>
            <input
              id="member-telephone"
              type="tel"
              value={telephone}
              onChange={(event) => setTelephone(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <label htmlFor="member-email">{t.memberForm.email}</label>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        <div className="field-stack">
          <label htmlFor="member-organization">
            {t.memberForm.organization}
          </label>
          <select
            id="member-organization"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            <option value="">{t.memberForm.unassigned}</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} ({t.organizationTypes[organization.type]})
              </option>
            ))}
          </select>
        </div>

        {isEditMode && (
          <>
            <div className="field-row field-stack">
              <input
                id="member-lost-contact"
                type="checkbox"
                checked={lostContact}
                onChange={(event) => setLostContact(event.target.checked)}
              />
              <label htmlFor="member-lost-contact">
                {t.memberForm.lostContact}
              </label>
            </div>

            {lostContact && (
              <div className="field-stack">
                <label htmlFor="member-last-active-date">
                  {t.memberForm.lastKnownActive}
                </label>
                <input
                  id="member-last-active-date"
                  type="date"
                  value={lastActiveDate}
                  onChange={(event) => setLastActiveDate(event.target.value)}
                />
              </div>
            )}
          </>
        )}

        {!isEditMode && (
          <div className="field-row field-stack">
            <input
              id="member-create-another"
              type="checkbox"
              checked={createAnother}
              onChange={(event) => setCreateAnother(event.target.checked)}
            />
            <label htmlFor="member-create-another">{t.memberForm.createAnother}</label>
          </div>
        )}

        <div
          className="field-row field-stack"
          style={{ justifyContent: "flex-end" }}
        >
          <button
            type="button"
            className="btn"
            onClick={() => dispatch(closeWindow("MEMBER_DIALOG"))}
          >
            {t.common.cancel}
          </button>
          {isEditMode && leader && (
            <button
              type="button"
              className="btn"
              onClick={() => setConfirmingRemove(true)}
            >
              {t.common.remove}
            </button>
          )}
          <button type="submit" className="btn btn-default">
            {t.common.save}
          </button>
        </div>
      </form>
    </Panel>
  );
}
