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
import DialogWindow from "ports/components/dialogs/DialogWindow.tsx";
import "ports/components/dialogs/dialogs.css";
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

  return (
    <div
      className="standard-dialog"
      style={{ minWidth: "320px", maxWidth: "66%", margin: "10vh auto" }}
    >
      {/* field-row, right-aligned per System.css's own docs. */}
      <div className="field-row" style={{ justifyContent: "flex-end" }}>
        <select
          aria-label={t.menu.language}
          value={language}
          onChange={(event) =>
            setLanguage(event.target.value as typeof language)
          }
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {languageLabels[lang]}
            </option>
          ))}
        </select>
      </div>

      <h2>{t.auth.signIn}</h2>

      {authError ? (
        <p role="alert" style={{ color: "firebrick" }}>
          {t.auth.linkExpired}
        </p>
      ) : null}

      {magicLinkStatus === "sent" ? (
        <p>{t.auth.linkSent}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Stacked, not System.css's horizontal field-row - a modern form
          reads label-above-input better than the library's own side-by-side
          dialog convention, especially with a full-width input. */}
          <div className="login-form-field">
            {/* Visually hidden, not removed - screen readers still get a real
            associated label (more robust than relying on the placeholder
            alone, which disappears once there's input and isn't consistently
            exposed as an accessible name by every assistive tech). */}
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
          </div>
          <button type="submit" className="btn login-form-submit">
            {t.auth.sendLoginLink}
          </button>
          {magicLinkStatus === "failed" ? (
            <p role="alert" style={{ color: "firebrick" }}>
              {magicLinkError ?? t.auth.genericError}
            </p>
          ) : null}
        </form>
      )}

      <div className="field-row" style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="login-form-link"
          onClick={() => setShowPrivacy(true)}
        >
          {t.auth.privacyLink}
        </button>
        <a
          className="login-form-link"
          href="https://github.com/cowglow/visual-directory"
          target="_blank"
          rel="nofollow noreferrer"
        >
          {t.auth.source}
        </a>
      </div>

      {showPrivacy ? (
        <div className="dialog-backdrop" onClick={() => setShowPrivacy(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <DialogWindow
              title={t.privacy.title}
              onClose={() => setShowPrivacy(false)}
            >
              <PrivacyNotice />
            </DialogWindow>
          </div>
        </div>
      ) : null}
    </div>
  );
}
