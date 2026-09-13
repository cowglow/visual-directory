import { MenuConfigItem } from "ports/components/action-menu/action-menu.types.ts";
import { openWindow } from "infrastructure/redux/windows/windows.slice.ts";
import { clearSelection, selectMembers } from "infrastructure/redux/selection/selection.slice.ts";
import { logout, Role } from "infrastructure/redux/auth/auth.slice.ts";
import type { AppDispatch } from "infrastructure/redux/store.ts";
import type { Translations } from "ports/i18n/translations/index.ts";
import { languages, languageLabels, type Language } from "ports/i18n/language.ts";
import type { Member } from "domain/member/member.types.ts";
import type { Organization } from "domain/organization/organization.types.ts";
import type { OrganizationType } from "domain/shared/types.ts";

export type MenuConfig = Record<string, MenuConfigItem[]>;

// The organization "levels" (OrganizationType values, top to bottom of the
// Region → Headquarter → Area → District → Group hierarchy) that the Map
// menu's "Select by Level" submenu offers as scopes.
const ORGANIZATION_TYPES: OrganizationType[] = ["Region", "Headquarter", "Area", "District", "Group"];

export interface MenuConfigDeps {
  dispatch: AppDispatch;
  role: Role | null;
  t: Translations;
  setLanguage: (language: Language) => void;
  onImport: () => void;
  onExportCsv: () => void;
  onExportGeoJson: () => void;
  members: Member[];
  organizations: Organization[];
  baseMapNames: string[];
  setSelectedBaseMap: (name: string) => void;
}

export function createMenuConfig({
  dispatch,
  role,
  t,
  setLanguage,
  onImport,
  onExportCsv,
  onExportGeoJson,
  members,
  organizations,
  baseMapNames,
  setSelectedBaseMap,
}: MenuConfigDeps): MenuConfig {
  // Selects every member belonging to any organization of the given type — a
  // broader scope than the Organizations tree's own double-click (which selects
  // one specific organization's members), since a "level" can span several orgs.
  // Members live on leaf-level organizations (Group), so selecting a higher
  // level like "Area" must pull in every org beneath it in the tree, not just
  // orgs of that exact type.
  const descendantOrgIds = (rootIds: Set<string>): Set<string> => {
    const result = new Set(rootIds);
    let grew = true;
    while (grew) {
      grew = false;
      for (const organization of organizations) {
        if (organization.parentId && result.has(organization.parentId) && !result.has(organization.id)) {
          result.add(organization.id);
          grew = true;
        }
      }
    }
    return result;
  };

  const selectByLevel = (type: OrganizationType) => {
    const orgIdsOfType = new Set(
      organizations.filter((organization) => organization.type === type).map((organization) => organization.id),
    );
    const scopeOrgIds = descendantOrgIds(orgIdsOfType);
    const memberIds = members
      .filter((member) => member.organizationId && scopeOrgIds.has(member.organizationId))
      .map((member) => member.id);
    dispatch(selectMembers(memberIds));
  };

  return {
    [t.menu.file]: [
      { label: t.menu.import, action: onImport },
      { label: t.menu.exportCsv, action: onExportCsv },
      { label: t.menu.exportGeoJson, action: onExportGeoJson },
      "---",
      {
        label: t.menu.language,
        items: languages.map((language) => ({
          label: languageLabels[language],
          action: () => setLanguage(language),
        })),
      },
      "---",
      { label: t.menu.signOut, action: () => dispatch(logout()) },
    ],
    [t.menu.organizations]: [
      {
        label: t.menu.openOrganizations,
        action: () => dispatch(openWindow({ type: "ORGANIZATION_TREE_DIALOG" })),
      },
      ...(role === "leader"
        ? ([
            "---",
            {
              label: t.menu.addOrganization,
              action: () => dispatch(openWindow({ type: "ORGANIZATION_DIALOG" })),
            },
            // No coordinates in the payload — MemberForm treats that as "no map
            // location yet" rather than a dead end, so this creates a member with
            // name/contact/org/status only.
            {
              label: t.menu.addMember,
              action: () => dispatch(openWindow({ type: "MEMBER_DIALOG" })),
            },
            {
              label: t.menu.inviteAccount,
              action: () => dispatch(openWindow({ type: "INVITE_DIALOG" })),
            },
            {
              label: t.menu.manageAccounts,
              action: () => dispatch(openWindow({ type: "ACCOUNTS_DIALOG" })),
            },
          ] as MenuConfigItem[])
        : []),
    ],
    [t.menu.map]: [
      { label: t.menu.openMap, action: () => dispatch(openWindow({ type: "MAP_DIALOG" })) },
      "---",
      {
        label: t.menu.basemap,
        items: baseMapNames.map((name) => ({ label: name, action: () => setSelectedBaseMap(name) })),
      },
      "---",
      {
        label: t.menu.selectByLevel,
        items: ORGANIZATION_TYPES.map((type) => ({
          label: t.organizationTypes[type],
          action: () => selectByLevel(type),
        })),
      },
      { label: t.menu.clearSelection, action: () => dispatch(clearSelection()) },
    ],
    [t.menu.about]: [
      { label: t.menu.systemCss, href: "https://sakofchit.github.io/system.css/" },
      { label: t.menu.sakunsTwitter, href: "https://x.com/sakofchit" },
      "---",
      { label: t.menu.githubRepo, href: "https://github.com/cowglow/visual-directory" },
      { label: t.menu.privacy, action: () => dispatch(openWindow({ type: "PRIVACY_DIALOG" })) },
    ],
  };
}
