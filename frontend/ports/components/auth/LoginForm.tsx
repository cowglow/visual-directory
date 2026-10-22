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
import "./login-form.css";

export default function LoginForm() {
  const dispatch = useDispatch();
  const { t, language, setLanguage } = useTranslation();
  const [email, setEmail] = useState("");
  const magicLinkStatus = useSelector(getMagicLinkStatus);
  const magicLinkError = useSelector(getMagicLinkError);
  // Set when a magic link was clicked but rejected (expired - 15 min TTL - or
  // already used) - see verifyMagicLinkFailed in auth.slice.ts.
  const authError = useSelector(getAuthError);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    dispatch(requestMagicLinkRequested({ email }));
  };

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
          {/* A separate static page (privacy.html), not an in-app panel — see
          PrivacyPage.tsx. Reachable without signing in either way, but this
          is a real page load, not app state, so it survives a page reload
          and is linkable on its own. */}
          <a className="login-form-link" href="./privacy.html" target="_blank" rel="noreferrer">
            {t.auth.privacyLink}
          </a>
          <a className="login-form-link" href="https://github.com/cowglow/visual-directory" target="_blank" rel="nofollow noreferrer">
            {t.auth.source}
          </a>
        </div>
      </div>
    </div>
  );
}
