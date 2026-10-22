import { useEffect, useMemo, useState } from "react";
import { closeWindow, openWindow } from "infrastructure/redux/windows/windows.slice.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import {
  fetchAccountsRequested,
  resetUpdateAccount,
  updateAccountRequested,
  type Account,
  type Role,
} from "infrastructure/redux/auth/auth.slice.ts";
import {
  getAccounts,
  getAccountsStatus,
  getUpdateAccountError,
  getUpdateAccountRequestId,
  getUpdateAccountStatus,
} from "infrastructure/redux/auth/auth.selectors.ts";
import { getMembers } from "infrastructure/redux/member/member.selectors.ts";
import { createRequestId } from "infrastructure/redux/request-id.ts";
import Panel from "ports/components/panel/Panel.tsx";
import "./AccountsForm.css";

type Edit = { role: Role; memberId: string };

export default function AccountsForm({ z }: { z?: number }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const accounts = useSelector(getAccounts);
  const accountsStatus = useSelector(getAccountsStatus);
  const members = useSelector(getMembers);
  const updateStatus = useSelector(getUpdateAccountStatus);
  const updateRequestId = useSelector(getUpdateAccountRequestId);
  const updateError = useSelector(getUpdateAccountError);

  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAccountsRequested());
  }, [dispatch]);

  useEffect(() => {
    if (!savingId || !updateRequestId) return;
    if (updateStatus === "failed") {
      alert(updateError ?? t.accountsForm.updateFailed);
      dispatch(resetUpdateAccount());
      setSavingId(null);
    } else if (updateStatus === "succeeded") {
      dispatch(resetUpdateAccount());
      setSavingId(null);
      setEdits((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== savingId)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStatus, updateRequestId]);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        `${a.name.lastName} ${a.name.firstName}`.localeCompare(`${b.name.lastName} ${b.name.firstName}`),
      ),
    [members],
  );

  const editFor = (account: Account): Edit =>
    edits[account.id] ?? { role: account.role, memberId: account.memberId ?? "" };

  const accountFor = (accountId: string): Account =>
    accounts.find((account) => account.id === accountId) ?? { id: accountId, email: "", role: "member", memberId: null };

  const setEdit = (accountId: string, patch: Partial<Edit>) => {
    setEdits((current) => ({ ...current, [accountId]: { ...editFor(accountFor(accountId)), ...patch } }));
  };

  const isDirty = (account: Account) => {
    const edit = editFor(account);
    return edit.role !== account.role || edit.memberId !== (account.memberId ?? "");
  };

  const handleSave = (account: Account) => {
    const edit = editFor(account);
    const requestId = createRequestId();
    setSavingId(account.id);
    dispatch(
      updateAccountRequested({
        requestId,
        accountId: account.id,
        role: edit.role,
        memberId: edit.memberId || null,
      }),
    );
  };

  const memberName = (memberId: string | null) => {
    const member = members.find((candidate) => candidate.id === memberId);
    return member ? `${member.name.firstName} ${member.name.lastName}` : null;
  };

  return (
    <Panel
      title={t.accountsForm.title}
      onClose={() => dispatch(closeWindow("ACCOUNTS_DIALOG"))}
      closeIcon="back"
      padded={false}
      bottomNav
      headerAction={
        <button type="button" onClick={() => dispatch(openWindow({ type: "INVITE_DIALOG" }))}>
          {t.menu.inviteAccount}
        </button>
      }
      z={z}
    >
      {accountsStatus === "pending" && accounts.length === 0 ? (
        <p className="accounts-empty">{t.accountsForm.loading}</p>
      ) : accounts.length === 0 ? (
        <p className="accounts-empty">{t.accountsForm.empty}</p>
      ) : (
        accounts.map((account) => {
          const edit = editFor(account);
          const linkedName = memberName(edit.memberId || null);
          const initials =
            (linkedName ?? account.email)
              .split(/[\s.@]+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("") || "?";
          return (
            <div className="account-row" key={account.id}>
              <div className="account-avatar">{initials}</div>
              <div className="account-identity">
                <div className="account-email">{account.email}</div>
                <div className="account-member">{linkedName ?? t.inviteForm.noMemberLink}</div>
              </div>
              <div className="account-controls">
                <select
                  aria-label={t.accountsForm.role}
                  value={edit.role}
                  onChange={(event) => setEdit(account.id, { role: event.target.value as Role })}
                >
                  <option value="member">{t.inviteForm.roleMember}</option>
                  <option value="leader">{t.inviteForm.roleLeader}</option>
                </select>
                <select
                  aria-label={t.accountsForm.member}
                  value={edit.memberId}
                  onChange={(event) => setEdit(account.id, { memberId: event.target.value })}
                >
                  <option value="">{t.inviteForm.noMemberLink}</option>
                  {sortedMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name.firstName} {member.name.lastName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-default"
                  disabled={!isDirty(account) || savingId === account.id}
                  onClick={() => handleSave(account)}
                >
                  {t.common.save}
                </button>
              </div>
            </div>
          );
        })
      )}
    </Panel>
  );
}
