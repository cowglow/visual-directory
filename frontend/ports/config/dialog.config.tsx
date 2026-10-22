import { DialogPayload, DialogType } from "infrastructure/redux/windows/windows.slice.ts";
import MemberForm from "ports/components/forms/MemberForm.tsx";
import OrganizationForm from "ports/components/forms/OrganizationForm.tsx";
import InviteForm from "ports/components/forms/InviteForm.tsx";
import AccountsForm from "ports/components/forms/AccountsForm.tsx";
import OrganizationTree from "ports/components/organization-tree/OrganizationTree.tsx";
import MapWindow from "ports/components/map/MapWindow.tsx";
import PrivacyDialog from "ports/components/privacy/PrivacyDialog.tsx";
import MenuSheet from "ports/components/nav/MenuSheet.tsx";
import { JSX } from "react";

// Every window is a full-screen Panel now, so the only thing z ever needs to
// reach is each component's own <Panel z={z}> — see Dialogs.tsx.
export const dialogConfig: Record<
  DialogType,
  (payload: DialogPayload | null, z?: number) => JSX.Element
> = {
  MEMBER_DIALOG: (payload, z) => <MemberForm payload={payload} z={z} />,
  ORGANIZATION_DIALOG: (payload, z) => <OrganizationForm payload={payload} z={z} />,
  INVITE_DIALOG: (_payload, z) => <InviteForm z={z} />,
  ACCOUNTS_DIALOG: (_payload, z) => <AccountsForm z={z} />,
  ORGANIZATION_TREE_DIALOG: (_payload, z) => <OrganizationTree z={z} />,
  MAP_DIALOG: (_payload, z) => <MapWindow z={z} />,
  PRIVACY_DIALOG: (_payload, z) => <PrivacyDialog z={z} />,
  MENU_DIALOG: (_payload, z) => <MenuSheet z={z} />,
};
