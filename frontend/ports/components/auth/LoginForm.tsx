import { FormEvent, useState } from "react";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { requestMagicLinkRequested } from "infrastructure/redux/auth/auth.slice.ts";
import { getMagicLinkError, getMagicLinkStatus } from "infrastructure/redux/auth/auth.selectors.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import DialogWindow from "ports/components/dialogs/DialogWindow.tsx";
import "ports/components/dialogs/dialogs.css";
import PrivacyNotice from "ports/components/privacy/PrivacyNotice.tsx";
import "./login-form.css";

export default function LoginForm() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  // No windows/dialog system is mounted pre-auth (AuthGate renders this instead
  // of App+Dialogs), so the privacy notice's visibility here is plain local
  // state rather than the redux window stack the rest of the app uses.
  const [showPrivacy, setShowPrivacy] = useState(false);
  const magicLinkStatus = useSelector(getMagicLinkStatus);
  const magicLinkError = useSelector(getMagicLinkError);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    dispatch(requestMagicLinkRequested({ email }));
  };

  return (
    <div className="standard-dialog" style={{ maxWidth: "320px", margin: "10vh auto" }}>
      <h2>{t.auth.signIn}</h2>
      {magicLinkStatus === "sent" ? (
        <p>{t.auth.linkSent}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">{t.auth.email}</label>
          <br />
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <br />
          <button type="submit" className="btn">
            {t.auth.sendLoginLink}
          </button>
          {magicLinkStatus === "failed" ? (
            <p role="alert" style={{ color: "firebrick" }}>
              {magicLinkError ?? t.auth.genericError}
            </p>
          ) : null}
        </form>
      )}
      <p style={{ marginTop: "1rem" }}>
        <button type="button" className="login-form-privacy-link" onClick={() => setShowPrivacy(true)}>
          {t.auth.privacyLink}
        </button>
      </p>
      {showPrivacy ? (
        <div className="dialog-backdrop" onClick={() => setShowPrivacy(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <DialogWindow title={t.privacy.title} onClose={() => setShowPrivacy(false)}>
              <PrivacyNotice />
            </DialogWindow>
          </div>
        </div>
      ) : null}
    </div>
  );
}
