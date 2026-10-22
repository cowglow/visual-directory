import { useEffect, useRef } from "react";
import ConnectionErrorBanner from "ports/components/ui/ConnectionErrorBanner.tsx";
import BottomNav from "ports/components/nav/BottomNav.tsx";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { fetchMembersRequested } from "infrastructure/redux/member/member.slice.ts";
import { getMemberError, getMembers } from "infrastructure/redux/member/member.selectors.ts";
import { fetchOrganizationsRequested } from "infrastructure/redux/organization/organization.slice.ts";
import { getOrganizationError, getOrganizations } from "infrastructure/redux/organization/organization.selectors.ts";
import { openWindow, pruneStaleWindows } from "infrastructure/redux/windows/windows.slice.ts";
import { getOpenWindows } from "infrastructure/redux/windows/windows.selectors.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

export default function App() {
  const dispatch = useDispatch();
  const memberError = useSelector(getMemberError);
  const organizationError = useSelector(getOrganizationError);
  const members = useSelector(getMembers);
  const organizations = useSelector(getOrganizations);
  const openWindows = useSelector(getOpenWindows);
  const { t } = useTranslation();

  useEffect(() => {
    dispatch(fetchMembersRequested());
    dispatch(fetchOrganizationsRequested());
    // Windows restored from localStorage already put something on screen -
    // only force the map open when there's truly nothing there yet (a first
    // visit, or a cleared/expired localStorage entry).
    if (openWindows.length === 0) {
      dispatch(openWindow({ type: "MAP_DIALOG" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Once real data has actually loaded, drop any restored window referencing
  // a member/organization that no longer exists (deleted since the window
  // was last open) - runs once per fresh load, not on every member/org edit.
  const pruned = useRef(false);
  useEffect(() => {
    if (pruned.current || (members.length === 0 && organizations.length === 0)) return;
    pruned.current = true;
    dispatch(
      pruneStaleWindows({
        memberIds: new Set(members.map((member) => member.id)),
        organizationIds: new Set(organizations.map((organization) => organization.id)),
      }),
    );
  }, [members, organizations, dispatch]);

  const connectionError = memberError ?? organizationError;

  // No app chrome of its own except two things that must float above
  // whichever full-screen Panel is open (rendered by Dialogs — see
  // dialog.config.tsx): the connection-error banner, and the single shared
  // BottomNav (it decides its own visibility/active tab from which window is
  // topmost — see its own file for why it isn't mounted per-screen).
  return (
    <>
      {connectionError && (
        <ConnectionErrorBanner
          message={t.connectionError(connectionError)}
          onRetry={() => {
            dispatch(fetchMembersRequested());
            dispatch(fetchOrganizationsRequested());
          }}
        />
      )}
      <BottomNav />
    </>
  );
}
