import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { useSelector } from "infrastructure/redux/hooks.ts";
import { getAccount, getMemberId } from "infrastructure/redux/auth/auth.selectors.ts";
import { getMemberById } from "infrastructure/redux/member/member.selectors.ts";
import { getOrganizationById } from "infrastructure/redux/organization/organization.selectors.ts";
import { buildMemberDataExport } from "application/member/member-export.ts";
import { createJSONFile } from "infrastructure/json/json.file.ts";
import "./privacy-notice.css";

// The member-facing half of docs/PRIVACY.md - what's collected, why, who can
// see it, and how to ask about it. The operator-facing half (retention policy,
// sub-processors, incident response) stays in that doc; it's not this
// audience's concern. Shared between LoginForm (pre-auth, no window chrome)
// and PrivacyDialog (post-auth, inside a DesktopWindow) so the text and its
// translations live in exactly one place.
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
    <div className="privacy-notice">
      <p>{t.privacy.intro}</p>
      <h3>{t.privacy.whatWeCollectTitle}</h3>
      <p>{t.privacy.whatWeCollect}</p>
      <h3>{t.privacy.whyTitle}</h3>
      <p>{t.privacy.why}</p>
      <h3>{t.privacy.whoSeesTitle}</h3>
      <p>{t.privacy.whoSees}</p>
      <h3>{t.privacy.retentionTitle}</h3>
      <p>{t.privacy.retention}</p>
      <h3>{t.privacy.rightsTitle}</h3>
      <p>{t.privacy.rights}</p>
      {canExport && (
        <button type="button" onClick={handleExport}>
          {t.privacy.exportMyData}
        </button>
      )}
    </div>
  );
}
