import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { useSelector } from "infrastructure/redux/hooks.ts";
import { getAccount, getMemberId } from "infrastructure/redux/auth/auth.selectors.ts";
import { getMemberById } from "infrastructure/redux/member/member.selectors.ts";
import { getOrganizationById } from "infrastructure/redux/organization/organization.selectors.ts";
import { buildMemberDataExport } from "application/member/member-export.ts";
import { createJSONFile } from "infrastructure/json/json.file.ts";
import PrivacyNoticeContent from "ports/components/privacy/PrivacyNoticeContent.tsx";

// The in-app version — same text as the standalone static page
// (PrivacyNoticeContent), plus the one thing that only makes sense inside
// the real app with a real session: letting a signed-in member export their
// own data. Shared between LoginForm (pre-auth) and PrivacyDialog (post-auth).
export default function PrivacyNotice() {
  const { t } = useTranslation();
  const account = useSelector(getAccount);
  const memberId = useSelector(getMemberId);
  const member = useSelector((state) => (memberId ? getMemberById(state, memberId) : undefined));
  const organization = useSelector((state) =>
    member?.organizationId ? getOrganizationById(state, member.organizationId) : undefined,
  );

  // Only an account linked to a member record has anything to export - a
  // leader-only account (no memberId) has nothing here to hand back. See
  // docs/PRIVACY.md's "Access requests" section.
  const canExport = Boolean(account && member);

  const handleExport = () => {
    if (!account || !member) return;
    const data = buildMemberDataExport(member, account, organization?.name ?? null);
    createJSONFile(JSON.stringify(data, null, 2), "my-data.json");
  };

  return (
    <>
      <PrivacyNoticeContent />
      {canExport && (
        <button type="button" className="btn" onClick={handleExport}>
          {t.privacy.exportMyData}
        </button>
      )}
    </>
  );
}
