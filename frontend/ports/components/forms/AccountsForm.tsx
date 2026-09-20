import { useEffect, useMemo, useState } from "react";
import { closeWindow } from "infrastructure/redux/windows/windows.slice.ts";
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
import DialogWindow from "ports/components/dialogs/DialogWindow.tsx";
import "./forms.css";
import "./AccountsForm.css";

type Edit = { role: Role; memberId: string };

export default function AccountsForm() {
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

  return (
    <DialogWindow
      title={t.accountsForm.title}
      onClose={() => dispatch(closeWindow("ACCOUNTS_DIALOG"))}
      className="accounts-window"
    >
      {accountsStatus === "pending" && accounts.length === 0 ? (
        <p>{t.accountsForm.loading}</p>
      ) : accounts.length === 0 ? (
        <p>{t.accountsForm.empty}</p>
      ) : (
        <div className="accounts-list">
          <div className="accounts-list-header">
            <span>{t.accountsForm.email}</span>
            <span>{t.accountsForm.role}</span>
            <span>{t.accountsForm.member}</span>
            <span />
          </div>
          {accounts.map((account) => {
            const edit = editFor(account);
            return (
              <div className="accounts-list-row" key={account.id}>
                <span className="accounts-list-email">{account.email}</span>
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
                  className="btn"
                  disabled={!isDirty(account) || savingId === account.id}
                  onClick={() => handleSave(account)}
                >
                  {t.common.save}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </DialogWindow>
  );
}
