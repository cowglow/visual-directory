import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { CURRENT_NOTICE_VERSION } from "domain/space/notice-version.ts";
import "./space-pages.css";

// Read from env vars with placeholders, per TASK.md section 3 ("controller
// (read name/contact from env vars, leave placeholders)") - the real values
// belong in the deployment's .env, not in source (see docs/WORKLOG.md for the
// exact lines to add to .env.example).
const CONTROLLER_NAME = import.meta.env.VITE_PRIVACY_CONTROLLER_NAME ?? "[controller name - set VITE_PRIVACY_CONTROLLER_NAME]";
const CONTROLLER_CONTACT =
  import.meta.env.VITE_PRIVACY_CONTROLLER_CONTACT ?? "[controller contact - set VITE_PRIVACY_CONTROLLER_CONTACT]";
const EVENT_END_AT = import.meta.env.VITE_EVENT_END_AT ?? "2026-11-01T00:00:00+01:00";

function formatRetentionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function PrivacyNoticePage() {
  const { t } = useTranslation();
  const p = t.spacePrivacy;

  return (
    <div className="space-page window">
      <h1>{p.title}</h1>
      <p>{p.intro}</p>

      <h2>{p.controllerTitle}</h2>
      <p>{p.controller(CONTROLLER_NAME, CONTROLLER_CONTACT)}</p>

      <h2>{p.purposeTitle}</h2>
      <p>{p.purpose}</p>

      <h2>{p.dataCollectedTitle}</h2>
      <p>{p.dataCollected}</p>

      <h2>{p.whoSeesTitle}</h2>
      <p>{p.whoSees}</p>

      <h2>{p.thirdPartiesTitle}</h2>
      <p>{p.thirdParties}</p>

      <h2>{p.retentionTitle}</h2>
      <p>{p.retention(formatRetentionDate(EVENT_END_AT))}</p>

      <h2>{p.rightsTitle}</h2>
      <p>{p.rights}</p>

      <p className="space-field-hint">{p.noticeVersion(CURRENT_NOTICE_VERSION)}</p>
    </div>
  );
}
