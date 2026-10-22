import { useSelector } from "infrastructure/redux/hooks.ts";
import { getOpenWindows } from "infrastructure/redux/windows/windows.selectors.ts";
import { dialogConfig } from "ports/config/dialog.config.tsx";

// Every open window renders as a full-screen Panel (see ports/components/panel/Panel.tsx) —
// there's no longer a distinction between a "windowed" dialog and a centered
// modal, since nothing floats or overlaps a backdrop any more. z stacks them
// in open/focus order (windows.slice.ts's restack()).
export default function Dialogs() {
  const windows = useSelector(getOpenWindows);

  return (
    <>
      {windows.map((window) => (
        <div key={window.id}>{dialogConfig[window.type](window.payload, window.z)}</div>
      ))}
    </>
  );
}
