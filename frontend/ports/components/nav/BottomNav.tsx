import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { openWindow, DialogType } from "infrastructure/redux/windows/windows.slice.ts";
import { getTopmostWindow } from "infrastructure/redux/windows/windows.selectors.ts";
import { isLeader } from "infrastructure/redux/auth/auth.selectors.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./bottom-nav.css";

const NAV_TYPES: ReadonlySet<DialogType> = new Set<DialogType>([
  "MAP_DIALOG",
  "ORGANIZATION_TREE_DIALOG",
  "ACCOUNTS_DIALOG",
]);

// Rendered exactly once (App.tsx), fixed to the viewport, above every Panel —
// not per-screen. Each of Map/Organizations/Accounts used to mount its own
// <BottomNav>, which put several copies of the same tab bar in the DOM
// simultaneously (only one ever visible, but all of them real, focusable
// elements) — a real accessibility bug, not just a testing inconvenience.
// Panel's `bottomNav` prop reserves the matching space in whichever screen is
// actually on top so this never covers that screen's own content.
export default function BottomNav() {
  const dispatch = useDispatch();
  const leader = useSelector(isLeader);
  const { t } = useTranslation();
  const topmost = useSelector(getTopmostWindow);

  if (!topmost || !NAV_TYPES.has(topmost.type)) {
    return null;
  }
  const active = topmost.type;
  // Position among the 4 tabs, in render order — drives the sliding
  // indicator below. Menu is never `active` while BottomNav renders at all
  // (see NAV_TYPES above), so it never needs a slot here.
  const activeIndex = active === "MAP_DIALOG" ? 0 : active === "ORGANIZATION_TREE_DIALOG" ? 1 : 2;

  const go = (type: DialogType) => () => dispatch(openWindow({ type }));

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-track">
        {/* The highlighted "surface" slides between tabs instead of each tab
            just toggling its own background on/off — see bottom-nav.css. */}
        <div className="bottom-nav-indicator" style={{ transform: `translateX(${activeIndex * 100}%)` }} />

        <button
          type="button"
          className={`bottom-nav-tab${active === "MAP_DIALOG" ? " is-active" : ""}`}
          aria-current={active === "MAP_DIALOG" ? "page" : undefined}
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
          className={`bottom-nav-tab${active === "ORGANIZATION_TREE_DIALOG" ? " is-active" : ""}`}
          aria-current={active === "ORGANIZATION_TREE_DIALOG" ? "page" : undefined}
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
            className={`bottom-nav-tab${active === "ACCOUNTS_DIALOG" ? " is-active" : ""}`}
            aria-current={active === "ACCOUNTS_DIALOG" ? "page" : undefined}
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
    </div>
  );
}
