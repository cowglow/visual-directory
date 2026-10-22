import { PropsWithChildren, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { getAuthError, getAuthStatus } from "infrastructure/redux/auth/auth.selectors.ts";
import { restoreSessionRequested, verifyMagicLinkRequested } from "infrastructure/redux/auth/auth.slice.ts";
import LoginForm from "ports/components/auth/LoginForm.tsx";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

export default function AuthGate({ children }: PropsWithChildren) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const status = useSelector(getAuthStatus);
  const error = useSelector(getAuthError);
  // Magic-link tokens are single-use: React StrictMode's dev-mode double-invoke of
  // this effect would otherwise fire a second /auth/verify with the same token,
  // which the server rejects and which then clobbers the first request's successful
  // login back to unauthenticated.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // The token is captured above; strip it from the URL right away rather than
      // waiting on the verify request — a magic link is single-use, so there's
      // nothing meaningful left to reload from it either way.
      params.delete("token");
      const query = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
      dispatch(verifyMagicLinkRequested({ token }));
    } else {
      dispatch(restoreSessionRequested());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "idle" || status === "loading") {
    return <p>{t.auth.loading}</p>;
  }

  if (status === "offline") {
    return (
      <div style={{ maxWidth: "320px", margin: "10vh auto", padding: "0 20px", textAlign: "center" }}>
        <h2>{t.auth.cantConnect}</h2>
        <p style={{ color: "var(--text-muted)" }}>{error}</p>
        <button type="button" className="btn btn-default" onClick={() => dispatch(restoreSessionRequested())}>
          {t.common.retry}
        </button>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <LoginForm />;
  }

  return <>{children}</>;
}
