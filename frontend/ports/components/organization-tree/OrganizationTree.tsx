import { KeyboardEvent, MouseEvent, useState } from "react";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { bringToFront, closeWindow, openWindow } from "infrastructure/redux/windows/windows.slice.ts";
import {
  clearSelection,
  selectMembers,
  toggleMember,
} from "infrastructure/redux/selection/selection.slice.ts";
import {
  getSelectedMemberIds,
  getSelectedMembers,
} from "infrastructure/redux/selection/selection.selectors.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { getOrganizations } from "infrastructure/redux/organization/organization.selectors.ts";
import { getMembers } from "infrastructure/redux/member/member.selectors.ts";
import { getMemberId, isLeader } from "infrastructure/redux/auth/auth.selectors.ts";
import { isMobileDevice } from "infrastructure/device/is-mobile-device.ts";
import DesktopWindow from "ports/components/windows/DesktopWindow.tsx";
import type { Member } from "domain/member/member.types.ts";
import type { Organization } from "domain/organization/organization.types.ts";
import type { OrganizationType } from "domain/shared/types.ts";
import type { Translations } from "ports/i18n/translations/index.ts";
import "./organization-tree.css";

// A sentinel key alongside real organization ids in the `openOrgs` expand/collapse
// set — safe since organization ids are UUIDs, never this literal string.
const UNASSIGNED_KEY = "__unassigned__";

// Short codes used throughout docs/INITIAL_ORGANIZATION_MAP.md and by the
// organization itself - shown as a small badge next to the full (translated)
// type name, not translated themselves since they're the org's own naming
// convention, not UI chrome.
const TYPE_ABBREVIATION: Record<OrganizationType, string> = {
  Region: "RG",
  Headquarter: "HS",
  Area: "BR",
  District: "BZ",
  Group: "GR",
};

// Real org names already carry their own type prefix (e.g. "HS Franken",
// per docs/INITIAL_ORGANIZATION_MAP.md) - stripped for display only, since
// the abbreviation now has its own badge and repeating it in the name reads
// as duplicated noise. The stored name itself is never touched.
function displayOrgName(organization: Organization): string {
  const prefix = `${TYPE_ABBREVIATION[organization.type]} `;
  return organization.name.startsWith(prefix) ? organization.name.slice(prefix.length) : organization.name;
}

function isMulti(event: MouseEvent | KeyboardEvent) {
  return event.shiftKey || event.metaKey || event.ctrlKey;
}

function displayName(member: Member, t: Translations) {
  return `${member.name.firstName} ${member.name.lastName}`.trim() || t.member.untitled;
}

function groupState(memberIds: string[], selectedSet: Set<string>): "none" | "some" | "all" {
  if (memberIds.length === 0) return "none";
  const selectedCount = memberIds.filter((id) => selectedSet.has(id)).length;
  if (selectedCount === 0) return "none";
  return selectedCount === memberIds.length ? "all" : "some";
}

type OrgTreeNode = { organization: Organization; children: OrgTreeNode[] };

// Real parent/child structure (Region → Headquarter → Area → District →
// Group, per docs/INITIAL_ORGANIZATION_MAP.md) instead of a flat grouping by
// type — an org with no parent (or an orphaned parentId) is a root.
function buildOrgTree(organizations: Organization[]): OrgTreeNode[] {
  const byId = new Map(organizations.map((organization) => [organization.id, organization]));
  const childrenById = new Map<string, Organization[]>();
  const roots: Organization[] = [];

  for (const organization of organizations) {
    if (organization.parentId && byId.has(organization.parentId)) {
      const siblings = childrenById.get(organization.parentId) ?? [];
      siblings.push(organization);
      childrenById.set(organization.parentId, siblings);
    } else {
      roots.push(organization);
    }
  }

  const sortByName = (list: Organization[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));
  const toNode = (organization: Organization): OrgTreeNode => ({
    organization,
    children: sortByName(childrenById.get(organization.id) ?? []).map(toNode),
  });

  return sortByName(roots).map(toNode);
}

// All members in this node's own organization plus every descendant's —
// what "select this node" and its member count both mean once orgs nest.
function subtreeMembers(node: OrgTreeNode, membersOf: (organizationId: string) => Member[]): Member[] {
  return [...membersOf(node.organization.id), ...node.children.flatMap((child) => subtreeMembers(child, membersOf))];
}

// Ids of every node that actually has children - the only ones that render a
// disclosure control at all, so the only ones "expand all" needs to open.
function expandableIds(nodes: OrgTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.children.length > 0 ? [node.organization.id, ...expandableIds(node.children)] : [],
  );
}

function MemberRow({
  member,
  selected,
  onSelect,
  t,
}: {
  member: Member;
  selected: boolean;
  onSelect: (event: MouseEvent | KeyboardEvent) => void;
  t: Translations;
}) {
  return (
    <li
      className={`org-tree-member${selected ? " is-selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(event);
        }
      }}
    >
      {displayName(member, t)}
    </li>
  );
}

// The two-line "type label above name, member count + edit action alongside"
// block shared by both an expandable (has children) row's <summary> content
// and a leaf row's plain clickable content.
function OrgNodeHeader({
  organization,
  memberCount,
  state,
  leader,
  onEditOrganization,
  t,
}: {
  organization: Organization;
  memberCount: number;
  state: "none" | "some" | "all";
  leader: boolean;
  onEditOrganization: () => void;
  t: Translations;
}) {
  return (
    <div className={`org-node-header org-node-header--${state}`}>
      <div className="org-type-label">{t.organizationTypes[organization.type]}</div>
      <div className="org-row">
        <span className="org-name">{displayOrgName(organization)}</span>
        <span className="org-member-count">{t.organizationTree.memberCount(memberCount)}</span>
        {leader && !isMobileDevice() && (
          <button
            type="button"
            className="btn org-edit-btn"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEditOrganization();
            }}
          >
            {t.common.edit}
          </button>
        )}
      </div>
    </div>
  );
}

function OrgNodeItem({
  node,
  membersOf,
  openOrgs,
  toggleOpen,
  selectedSet,
  onSelectMember,
  onSelectGroup,
  leader,
  onEditOrganization,
  t,
}: {
  node: OrgTreeNode;
  membersOf: (organizationId: string) => Member[];
  openOrgs: Set<string>;
  toggleOpen: (key: string, open: boolean) => void;
  selectedSet: Set<string>;
  onSelectMember: (id: string, event: MouseEvent | KeyboardEvent) => void;
  onSelectGroup: (groupKey: string, groupMembers: Member[]) => void;
  leader: boolean;
  onEditOrganization: (organizationId: string) => void;
  t: Translations;
}) {
  const directMembers = membersOf(node.organization.id);
  const allMembers = subtreeMembers(node, membersOf);
  const hasChildren = node.children.length > 0;
  const state = groupState(
    allMembers.map((member) => member.id),
    selectedSet,
  );
  const editThis = () => onEditOrganization(node.organization.id);

  const header = (
    <OrgNodeHeader
      organization={node.organization}
      memberCount={allMembers.length}
      state={state}
      leader={leader}
      onEditOrganization={editThis}
      t={t}
    />
  );

  if (!hasChildren) {
    // A leaf has nothing to expand/collapse, but its members are always
    // shown (not hidden behind a toggle, since there's no disclosure control
    // to hide them behind) - double-click the header to select all of them
    // at once, matching a branch's header; click one by name to select just
    // that person.
    return (
      <li>
        <div
          className="org-leaf-row"
          role="button"
          tabIndex={0}
          title={t.organizationTree.selectHint}
          onDoubleClick={() => onSelectGroup(node.organization.id, directMembers)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelectGroup(node.organization.id, directMembers);
            }
          }}
        >
          {header}
        </div>
        {directMembers.length > 0 ? (
          <ul>
            {directMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                selected={selectedSet.has(member.id)}
                onSelect={(event) => onSelectMember(member.id, event)}
                t={t}
              />
            ))}
          </ul>
        ) : (
          <p className="org-tree-empty">{t.organizationTree.noMembers}</p>
        )}
      </li>
    );
  }

  return (
    <li>
      <details
        open={openOrgs.has(node.organization.id)}
        onToggle={(event) => toggleOpen(node.organization.id, event.currentTarget.open)}
      >
        {/* Single click just expands/collapses, like any tree node. Double
            click selects every member in this org's subtree (and leaves it
            expanded). */}
        <summary
          title={t.organizationTree.selectHint}
          onDoubleClick={() => onSelectGroup(node.organization.id, allMembers)}
        >
          {header}
        </summary>
        <ul>
          {/* A branch org can itself have direct members, not just child
          orgs - membership isn't restricted to leaf (typically Group)
          level. Previously only a leaf's own directMembers ever rendered
          here, so a member assigned straight to a Region/Headquarter/Area/
          District was counted in the header above but never actually
          listed. */}
          {directMembers.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              selected={selectedSet.has(member.id)}
              onSelect={(event) => onSelectMember(member.id, event)}
              t={t}
            />
          ))}
          {node.children.map((child) => (
            <OrgNodeItem
              key={child.organization.id}
              node={child}
              membersOf={membersOf}
              openOrgs={openOrgs}
              toggleOpen={toggleOpen}
              selectedSet={selectedSet}
              onSelectMember={onSelectMember}
              onSelectGroup={onSelectGroup}
              leader={leader}
              onEditOrganization={onEditOrganization}
              t={t}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

function MemberPreview({
  member,
  organizationName,
  canWrite,
  t,
  onEdit,
}: {
  member: Member;
  organizationName?: string;
  canWrite: boolean;
  t: Translations;
  onEdit: () => void;
}) {
  const status =
    member.status.kind === "lost-contact"
      ? t.memberMarker.lostContactSince(member.status.lastActiveDate.slice(0, 10))
      : t.memberMarker.active;

  return (
    <div className="org-preview-card">
      <h2 className="org-preview-name">{displayName(member, t)}</h2>
      <dl className="org-preview-fields">
        <dt>{t.memberForm.organization}</dt>
        <dd>{organizationName ?? t.memberForm.unassigned}</dd>
        <dt>{t.memberForm.telephone}</dt>
        <dd>{member.contact?.telephone || t.organizationTree.noPhone}</dd>
        <dt>{t.memberForm.email}</dt>
        <dd>{member.contact?.email || t.organizationTree.noEmail}</dd>
        {member.address && (
          <>
            <dt>{t.organizationTree.coordinates}</dt>
            <dd>
              {member.address.coordinates.lat.toFixed(4)}, {member.address.coordinates.lng.toFixed(4)}
            </dd>
          </>
        )}
      </dl>
      <p className="org-preview-status">
        {t.memberMarker.statusLabel}: {status}
      </p>
      {canWrite && (
        <div className="org-preview-actions">
          <button className="btn btn-default" onClick={onEdit}>
            {t.common.edit}
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrganizationTree({ z }: { z?: number }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const organizations = useSelector(getOrganizations);
  const members = useSelector(getMembers);
  const selectedIds = useSelector(getSelectedMemberIds);
  const selectedMembers = useSelector(getSelectedMembers);
  const leader = useSelector(isLeader);
  const ownMemberId = useSelector(getMemberId);
  const [openOrgs, setOpenOrgs] = useState<Set<string>>(new Set());

  const selectedSet = new Set(selectedIds);
  const hasSelection = selectedIds.length > 0;
  // On mobile, selecting a group still highlights it on the map (the actual
  // point of selecting) - the text preview panel is desktop-only real estate
  // better spent letting the map itself be seen.
  const showPreview = hasSelection && !isMobileDevice();
  const hasOrganizations = organizations.length > 0;
  const tree = buildOrgTree(organizations);
  const allExpandableIds = expandableIds(tree);
  const allExpanded = allExpandableIds.length > 0 && allExpandableIds.every((id) => openOrgs.has(id));

  const membersOf = (organizationId: string) =>
    members.filter((member) => member.organizationId === organizationId);
  const unassignedMembers = members.filter((member) => !member.organizationId);

  const selectMember = (id: string, event: MouseEvent | KeyboardEvent) =>
    dispatch(isMulti(event) ? toggleMember(id) : selectMembers([id]));

  const selectGroup = (groupKey: string, groupMembers: Member[]) => {
    dispatch(selectMembers(groupMembers.map((member) => member.id)));
    setOpenOrgs((prev) => new Set(prev).add(groupKey));
  };

  const toggleOpen = (key: string, open: boolean) => {
    setOpenOrgs((prev) => {
      if (prev.has(key) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const organizationNameFor = (member: Member) =>
    organizations.find((organization) => organization.id === member.organizationId)?.name;

  return (
    <DesktopWindow
      title={t.organizationTree.title}
      onClose={() => dispatch(closeWindow("ORGANIZATION_TREE_DIALOG"))}
      onFocus={() => dispatch(bringToFront("ORGANIZATION_TREE_DIALOG"))}
      initialPosition={{ x: 96, y: 96 }}
      width={showPreview ? "min(810px, 94vw)" : "min(460px, 92vw)"}
      height="auto"
      z={z}
      padded
    >
      <div className="org-tree-layout">
        <div className="org-tree-main">
          {!hasOrganizations && unassignedMembers.length === 0 && <p>{t.organizationTree.empty}</p>}
          {(allExpandableIds.length > 0 || hasSelection) && (
            <div className="org-tree-toolbar">
              {allExpandableIds.length > 0 ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpenOrgs(allExpanded ? new Set() : new Set(allExpandableIds))}
                >
                  {allExpanded ? t.organizationTree.collapseAll : t.organizationTree.expandAll}
                </button>
              ) : (
                <span />
              )}
              {hasSelection && (
                <button type="button" className="btn" onClick={() => dispatch(clearSelection())}>
                  {t.organizationTree.clear}
                </button>
              )}
            </div>
          )}
          <ul className="org-tree">
            {tree.map((node) => (
              <OrgNodeItem
                key={node.organization.id}
                node={node}
                membersOf={membersOf}
                openOrgs={openOrgs}
                toggleOpen={toggleOpen}
                selectedSet={selectedSet}
                onSelectMember={selectMember}
                onSelectGroup={selectGroup}
                leader={leader}
                onEditOrganization={(organizationId) =>
                  dispatch(openWindow({ type: "ORGANIZATION_DIALOG", payload: { organizationId } }))
                }
                t={t}
              />
            ))}
            {unassignedMembers.length > 0 && (
              <li>
                <details
                  open={openOrgs.has(UNASSIGNED_KEY)}
                  onToggle={(event) => toggleOpen(UNASSIGNED_KEY, event.currentTarget.open)}
                >
                  <summary
                    title={t.organizationTree.selectHint}
                    onDoubleClick={() => selectGroup(UNASSIGNED_KEY, unassignedMembers)}
                  >
                    <span
                      className={`org-name org-name--${groupState(
                        unassignedMembers.map((member) => member.id),
                        selectedSet,
                      )}`}
                    >
                      {t.organizationTree.unassigned} ({unassignedMembers.length})
                    </span>
                  </summary>
                  <ul>
                    {unassignedMembers.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        selected={selectedSet.has(member.id)}
                        onSelect={(event) => selectMember(member.id, event)}
                        t={t}
                      />
                    ))}
                  </ul>
                </details>
              </li>
            )}
          </ul>
        </div>

        {showPreview && (
          <aside className="org-preview">
            {selectedMembers.length === 1 ? (
              <MemberPreview
                member={selectedMembers[0]}
                organizationName={organizationNameFor(selectedMembers[0])}
                canWrite={leader || ownMemberId === selectedMembers[0].id}
                t={t}
                onEdit={() =>
                  dispatch(
                    openWindow({
                      type: "MEMBER_DIALOG",
                      payload: { memberId: selectedMembers[0].id },
                    }),
                  )
                }
              />
            ) : (
              <>
                <strong>{t.organizationTree.selectedCount(selectedMembers.length)}</strong>
                <ul className="org-preview-list">
                  {selectedMembers.map((member) => (
                    <li key={member.id}>{displayName(member, t)}</li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        )}
      </div>
    </DesktopWindow>
  );
}
