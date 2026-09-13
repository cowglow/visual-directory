import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./privacy-notice.css";

// The member-facing half of docs/PRIVACY.md - what's collected, why, who can
// see it, and how to ask about it. The operator-facing half (retention policy,
// sub-processors, incident response) stays in that doc; it's not this
// audience's concern. Shared between LoginForm (pre-auth, no window chrome)
// and PrivacyDialog (post-auth, inside a DesktopWindow) so the text and its
// translations live in exactly one place.
export default function PrivacyNotice() {
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
