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
import { isLeader } from "infrastructure/redux/auth/auth.selectors.ts";
import { logout } from "infrastructure/redux/auth/auth.slice.ts";
import { getMemberImportResult, getMembers } from "infrastructure/redux/member/member.selectors.ts";
import { clearImportResult, importMembersRequested } from "infrastructure/redux/member/member.slice.ts";
import { languageLabels, languages } from "ports/i18n/language.ts";
import "./menu-sheet.css";

export default function MenuSheet({ z }: { z?: number }) {
  const dispatch = useDispatch();
  const { t, language, setLanguage } = useTranslation();
  const leader = useSelector(isLeader);
  const members = useSelector(getMembers);
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

  return (
    <Panel title={t.nav.menu} onClose={() => dispatch(closeWindow("MENU_DIALOG"))} closeIcon="back" padded={false} z={z}>
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={inputHandler} />

      {leader && (
        <>
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
        </>
      )}

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
