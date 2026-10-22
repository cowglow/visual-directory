import { FormEvent, useState } from "react";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { requestMagicLinkRequested } from "infrastructure/redux/auth/auth.slice.ts";
import {
  getAuthError,
  getMagicLinkError,
  getMagicLinkStatus,
} from "infrastructure/redux/auth/auth.selectors.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { languageLabels, languages } from "ports/i18n/language.ts";
import Panel from "ports/components/panel/Panel.tsx";
import PrivacyNotice from "ports/components/privacy/PrivacyNotice.tsx";
import "./login-form.css";

export default function LoginForm() {
  const dispatch = useDispatch();
  const { t, language, setLanguage } = useTranslation();
  const [email, setEmail] = useState("");
  // No windows/dialog system is mounted pre-auth (AuthGate renders this instead
  // of App+Dialogs), so the privacy notice's visibility here is plain local
  // state rather than the redux window stack the rest of the app uses.
  const [showPrivacy, setShowPrivacy] = useState(false);
  const magicLinkStatus = useSelector(getMagicLinkStatus);
  const magicLinkError = useSelector(getMagicLinkError);
  // Set when a magic link was clicked but rejected (expired - 15 min TTL - or
  // already used) - see verifyMagicLinkFailed in auth.slice.ts.
  const authError = useSelector(getAuthError);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    dispatch(requestMagicLinkRequested({ email }));
  };

  if (showPrivacy) {
    return (
      <Panel title={t.privacy.title} onClose={() => setShowPrivacy(false)}>
        <PrivacyNotice />
      </Panel>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-content">
        <h1 className="login-title">{t.auth.signIn}</h1>

        {authError ? <p className="login-error">{t.auth.linkExpired}</p> : null}

        {magicLinkStatus === "sent" ? (
          <p>{t.auth.linkSent}</p>
        ) : (
          <form onSubmit={handleSubmit} className="login-form-fields">
            <label htmlFor="login-email" className="visually-hidden">
              {t.auth.email}
            </label>
            <input
              id="login-email"
              type="email"
              placeholder={t.auth.email}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button type="submit" className="btn btn-default login-form-submit">
              {t.auth.sendLoginLink}
            </button>
            {magicLinkStatus === "failed" ? <p className="login-error">{magicLinkError ?? t.auth.genericError}</p> : null}
          </form>
        )}
      </div>

      <div className="login-footer">
        <div className="login-lang-pills">
          {languages.map((lang) => (
            <button
              type="button"
              key={lang}
              className={`login-lang-pill${lang === language ? " is-active" : ""}`}
              onClick={() => setLanguage(lang)}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
        <div className="login-links">
          <button type="button" className="login-form-link" onClick={() => setShowPrivacy(true)}>
            {t.auth.privacyLink}
          </button>
          <a className="login-form-link" href="https://github.com/cowglow/visual-directory" target="_blank" rel="nofollow noreferrer">
            {t.auth.source}
          </a>
        </div>
      </div>
    </div>
  );
}
