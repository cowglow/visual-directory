import type { RootState } from "infrastructure/redux/store.ts";
import type { WindowInstance } from "infrastructure/redux/windows/windows.slice.ts";

export function getOpenWindows(state: RootState): WindowInstance[] {
  return state.windows.items;
}

export function isWindowOpen(state: RootState, id: string): boolean {
  return state.windows.items.some((window) => window.id === id);
}

// The one window actually on top right now, if any are open — every window is
// a full-screen Panel (see ports/components/panel/Panel.tsx), so exactly one
// of them is ever visible at a time; this is what BottomNav uses to decide
// whether to show itself at all, and which tab (if any) to mark active.
export function getTopmostWindow(state: RootState): WindowInstance | undefined {
  const { items } = state.windows;
  if (items.length === 0) return undefined;
  return items.reduce((top, window) => ((window.z ?? 0) > (top.z ?? 0) ? window : top));
}
