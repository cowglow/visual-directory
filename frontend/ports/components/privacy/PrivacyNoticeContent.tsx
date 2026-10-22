import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./privacy-notice.css";

// The actual text of docs/PRIVACY.md's member-facing half — what's collected,
// why, who can see it, and how to ask about it. Deliberately has no
// dependency beyond i18n (no redux, no account/member lookups), so it can be
// mounted on its own with nothing but an I18nContextProvider — see
// privacy.html/privacy-main.tsx, the standalone static page this was split
// out for. PrivacyNotice.tsx (the in-app version, pre- or post-auth) wraps
// this and adds the account-aware "export my data" action, which only makes
// sense inside the real app.
export default function PrivacyNoticeContent() {
  const { t } = useTranslation();

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
    </div>
  );
}
