import { PropsWithChildren, ReactNode } from "react";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./panel.css";

interface PanelProps {
  title: string;
  /** Omit entirely for a screen with nowhere to go "back" to (the map home screen). */
  onClose?: () => void;
  /** "back" for a peer top-level screen reached from the bottom nav, "close" (default) for a form/dialog. */
  closeIcon?: "back" | "close";
  /** A single header-right control, e.g. "Invite" or "Add organization". */
  headerAction?: ReactNode;
  /** The bottom nav, for the handful of screens that show it. */
  footer?: ReactNode;
  /** false for content that manages its own padding (lists, the map). */
  padded?: boolean;
  /** false only for the map — it fills the body exactly via its own flex sizing, never scrolls. */
  scroll?: boolean;
  /** Stacking order among simultaneously-open panels — see windows.slice.ts. */
  z?: number;
}

// Replaces both the old DesktopWindow (draggable/resizable) and DialogWindow
// (static modal chrome) with one full-screen panel, on every viewport size —
// there is no floating-window desktop metaphor left to support.
export default function Panel({
  title,
  onClose,
  closeIcon = "close",
  headerAction,
  footer,
  padded = true,
  scroll = true,
  z,
  children,
}: PropsWithChildren<PanelProps>) {
  const { t } = useTranslation();

  return (
    <div className="panel" style={z !== undefined ? { zIndex: z } : undefined}>
      <div className="panel-header">
        {onClose && (
          <button
            type="button"
            className="panel-header-btn"
            aria-label={closeIcon === "back" ? t.nav.back : t.common.close}
            onClick={onClose}
          >
            {closeIcon === "back" ? (
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            )}
          </button>
        )}
        <span className="panel-title">{title}</span>
        {headerAction && <div className="panel-header-action">{headerAction}</div>}
      </div>
      <div
        className="panel-body"
        style={{
          padding: padded ? "20px" : 0,
          display: padded ? "block" : "flex",
          flexDirection: padded ? undefined : "column",
          overflowY: scroll ? "auto" : "hidden",
        }}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
