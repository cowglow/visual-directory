import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { languageLabels, languages } from "ports/i18n/language.ts";
import PrivacyNoticeContent from "ports/components/privacy/PrivacyNoticeContent.tsx";
import "./privacy-page.css";

// The entry point for privacy.html — a standalone page, separate from the
// main app bundle, reachable by direct URL with no sign-in and no backend
// call at all (see privacy-main.tsx). Anyone can read it, or link to it from
// outside the app (an email footer, an app listing), without the SPA's auth
// bootstrap in the way. The in-app version (ports/components/privacy/
// PrivacyNotice.tsx, used pre- and post-auth inside the app itself) shares
// the same text via PrivacyNoticeContent and additionally offers a signed-in
// member's own "export my data" action, which has no meaning here.
export default function PrivacyPage() {
  const { t, language, setLanguage } = useTranslation();

  return (
    <div className="privacy-page">
      <div className="privacy-page-header">
        <h1>{t.privacy.title}</h1>
        <div className="privacy-page-langs">
          {languages.map((lang) => (
            <button
              type="button"
              key={lang}
              className={`privacy-page-lang${lang === language ? " is-active" : ""}`}
              onClick={() => setLanguage(lang)}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
      </div>
      <PrivacyNoticeContent />
    </div>
  );
}
