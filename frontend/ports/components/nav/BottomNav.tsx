import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { openWindow, DialogType } from "infrastructure/redux/windows/windows.slice.ts";
import { isLeader } from "infrastructure/redux/auth/auth.selectors.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./bottom-nav.css";

type Tab = "map" | "organizations" | "accounts";

interface BottomNavProps {
  active: Tab;
}

// Replaces the old hover-driven top menu bar (action-menu.css relied entirely
// on :hover/:focus-within CSS, with no touch equivalent). Rendered by each of
// the three top-level screens it links between, not globally — Menu and every
// form/dialog screen below it deliberately has no bottom nav of its own.
export default function BottomNav({ active }: BottomNavProps) {
  const dispatch = useDispatch();
  const leader = useSelector(isLeader);
  const { t } = useTranslation();

  const go = (type: DialogType) => () => dispatch(openWindow({ type }));

  return (
    <div className="bottom-nav">
      <button
        type="button"
        className={`bottom-nav-tab${active === "map" ? " is-active" : ""}`}
        aria-current={active === "map" ? "page" : undefined}
        onClick={go("MAP_DIALOG")}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-7-7.1-7-12a7 7 0 0 1 14 0c0 4.9-7 12-7 12z" />
          <circle cx="12" cy="9" r="2.4" />
        </svg>
        <span>{t.mapWindow.title}</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-tab${active === "organizations" ? " is-active" : ""}`}
        aria-current={active === "organizations" ? "page" : undefined}
        onClick={go("ORGANIZATION_TREE_DIALOG")}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="5" r="2.2" />
          <circle cx="6" cy="19" r="2.2" />
          <circle cx="18" cy="19" r="2.2" />
          <path d="M12 7.2v4M12 11.2 6 16.8M12 11.2l6 5.6" />
        </svg>
        <span>{t.organizationTree.title}</span>
      </button>

      {leader ? (
        <button
          type="button"
          className={`bottom-nav-tab${active === "accounts" ? " is-active" : ""}`}
          aria-current={active === "accounts" ? "page" : undefined}
          onClick={go("ACCOUNTS_DIALOG")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 20c0-3.3 2.5-5.6 5.5-5.6s5.5 2.3 5.5 5.6" />
            <circle cx="17.5" cy="9" r="2.3" />
            <path d="M15.2 14.8c2.6.3 4.3 2.3 4.3 5.2" />
          </svg>
          <span>{t.nav.accounts}</span>
        </button>
      ) : (
        <button type="button" className="bottom-nav-tab is-disabled" disabled aria-label={t.nav.accountsRestricted}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 20c0-3.3 2.5-5.6 5.5-5.6s5.5 2.3 5.5 5.6" />
            <circle cx="17.5" cy="9" r="2.3" />
            <path d="M15.2 14.8c2.6.3 4.3 2.3 4.3 5.2" />
          </svg>
          <span>{t.nav.accounts}</span>
        </button>
      )}

      <button type="button" className="bottom-nav-tab" onClick={go("MENU_DIALOG")}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span>{t.nav.menu}</span>
      </button>
    </div>
  );
}
