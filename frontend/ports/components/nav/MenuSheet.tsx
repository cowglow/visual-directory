import { ChangeEvent, useEffect, useRef } from "react";
import Panel from "ports/components/panel/Panel.tsx";
import useCsvData from "ports/components/import-export/use-csv-data.ts";
import { csvRowsToMembers, memberToCSVRow } from "application/csv/member.csv.ts";
import { membersToGeoJSON } from "application/geojson/member.geojson.ts";
import { createGeoJSONFile } from "infrastructure/geojson/geojson.file.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { useTileServer } from "ports/context/tile-server/tile-server.hook.ts";
import { useDispatch, useSelector } from "infrastructure/redux/hooks.ts";
import { closeWindow, openWindow } from "infrastructure/redux/windows/windows.slice.ts";
import { logout } from "infrastructure/redux/auth/auth.slice.ts";
import { getMemberImportResult, getMembers } from "infrastructure/redux/member/member.selectors.ts";
import { clearImportResult, importMembersRequested } from "infrastructure/redux/member/member.slice.ts";
import { getOrganizations } from "infrastructure/redux/organization/organization.selectors.ts";
import { clearSelection, selectMembers } from "infrastructure/redux/selection/selection.slice.ts";
import { languageLabels, languages } from "ports/i18n/language.ts";
import type { OrganizationType } from "domain/shared/types.ts";
import "./menu-sheet.css";

const ORGANIZATION_TYPES: OrganizationType[] = ["Region", "Headquarter", "Area", "District", "Group"];

export default function MenuSheet({ z }: { z?: number }) {
  const dispatch = useDispatch();
  const { t, language, setLanguage } = useTranslation();
  const members = useSelector(getMembers);
  const organizations = useSelector(getOrganizations);
  const importResult = useSelector(getMemberImportResult);
  const { data, importCSVFile, exportCSVFile } = useCsvData();
  const { baseMaps, selectedBaseMap, setSelectedBaseMap } = useTileServer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    dispatch(importMembersRequested({ members: csvRowsToMembers(data) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!importResult) return;
    if (importResult.failed > 0) {
      alert(t.importExport.importResult(importResult.success, importResult.total, importResult.failed));
    }
    dispatch(clearImportResult());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importResult]);

  const inputHandler = ({ target }: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = target.files && target.files[0];
    if (!selectedFile) return;
    importCSVFile(selectedFile);
    target.value = "";
  };

  // Selects every member belonging to any organization of the given type (and
  // everything beneath it in the hierarchy) — see the former menu.config.ts
  // for the original rationale, carried over unchanged.
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

  return (
    <Panel title={t.nav.menu} onClose={() => dispatch(closeWindow("MENU_DIALOG"))} closeIcon="back" padded={false} z={z}>
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={inputHandler} />

      <div className="menu-group-label">{t.menu.dataGroup}</div>
      <button type="button" className="menu-row" onClick={() => fileInputRef.current?.click()}>
        {t.menu.import}
      </button>
      <button
        type="button"
        className="menu-row"
        onClick={() => exportCSVFile(members.map(memberToCSVRow), "members.csv")}
      >
        {t.menu.exportCsv}
      </button>
      <button
        type="button"
        className="menu-row"
        onClick={() => createGeoJSONFile(JSON.stringify(membersToGeoJSON(members), null, 2), "members.geojson")}
      >
        {t.menu.exportGeoJson}
      </button>

      <div className="menu-group-label">{t.menu.map}</div>
      <details>
        <summary className="menu-row">
          {t.menu.basemap}
          <span className="menu-row-value">{selectedBaseMap}</span>
        </summary>
        <div className="menu-subrows">
          {Object.keys(baseMaps).map((name) => (
            <button
              type="button"
              key={name}
              className={`menu-row menu-subrow${name === selectedBaseMap ? " is-selected" : ""}`}
              onClick={() => setSelectedBaseMap(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </details>
      <details>
        <summary className="menu-row">{t.menu.selectByLevel}</summary>
        <div className="menu-subrows">
          {ORGANIZATION_TYPES.map((type) => (
            <button type="button" key={type} className="menu-row menu-subrow" onClick={() => selectByLevel(type)}>
              {t.organizationTypes[type]}
            </button>
          ))}
        </div>
      </details>
      <button type="button" className="menu-row" onClick={() => dispatch(clearSelection())}>
        {t.menu.clearSelection}
      </button>

      <div className="menu-group-label">{t.menu.language}</div>
      {languages.map((lang) => (
        <button
          type="button"
          key={lang}
          className={`menu-row${lang === language ? " is-selected" : ""}`}
          onClick={() => setLanguage(lang)}
        >
          {languageLabels[lang]}
        </button>
      ))}

      <div className="menu-group-label">{t.menu.accountGroup}</div>
      <button type="button" className="menu-row menu-row-danger" onClick={() => dispatch(logout())}>
        {t.menu.signOut}
      </button>

      <div className="menu-group-label">{t.menu.about}</div>
      <a className="menu-row" href="https://github.com/cowglow/visual-directory" target="_blank" rel="nofollow noreferrer">
        {t.menu.githubRepo}
      </a>
      <button type="button" className="menu-row" onClick={() => dispatch(openWindow({ type: "PRIVACY_DIALOG" }))}>
        {t.menu.privacy}
      </button>
    </Panel>
  );
}
