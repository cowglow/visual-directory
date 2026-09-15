import { useState } from "react";
import type { AddressValue, FieldDef } from "domain/space/space.types.ts";
import { locateAddress } from "ports/pages/space/geolocate-address.ts";

interface DynamicFieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

function AddressField({ field, value, onChange }: DynamicFieldProps) {
  const id = `entry-field-${field.key}`;
  const address = (value as AddressValue | undefined) ?? { text: "", lat: null, lng: null };
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [locating, setLocating] = useState(false);

  const handleUseLocation = async () => {
    setLocating(true);
    setStatus({ text: "Finding your location…", ok: true });
    try {
      const located = await locateAddress();
      onChange(located);
      setStatus({ text: "Found it — double-check the address looks right.", ok: true });
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : "Couldn't get your location.", ok: false });
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-field">
      <label htmlFor={id}>
        {field.label}
        {field.required ? " *" : ""}
      </label>
      <div className="space-field-row">
        <input
          id={id}
          type="text"
          value={address.text}
          // A hand edit after a location lookup means the address may no
          // longer match those coordinates - drop them rather than attach a
          // stale/wrong pin, same reasoning as the standalone prototype.
          onChange={(event) => onChange({ text: event.target.value, lat: null, lng: null })}
        />
        <button type="button" className="btn space-field-remove" onClick={handleUseLocation} disabled={locating}>
          📍 Use my location
        </button>
      </div>
      {status ? <p className={status.ok ? "space-status" : "space-error"}>{status.text}</p> : null}
    </div>
  );
}

// One form control per FieldDef.type - this is the whole mechanism that lets a
// new event kind (garage sale, volunteer sign-up, ...) exist without a new
// form component: the event's own fieldSchema drives what renders here.
export default function DynamicField({ field, value, onChange }: DynamicFieldProps) {
  const id = `entry-field-${field.key}`;

  switch (field.type) {
    case "address":
      return <AddressField field={field} value={value} onChange={onChange} />;

    case "boolean":
      return (
        <label htmlFor={id} className="space-field-checkbox">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          {field.label}
        </label>
      );

    case "select":
      return (
        <div className="space-field">
          <label htmlFor={id}>
            {field.label}
            {field.required ? " *" : ""}
          </label>
          <select id={id} value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)}>
            <option value="">— Select —</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );

    case "textarea":
      return (
        <div className="space-field">
          <label htmlFor={id}>
            {field.label}
            {field.required ? " *" : ""}
          </label>
          <textarea
            id={id}
            rows={3}
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );

    case "text":
    case "time-range":
    default:
      return (
        <div className="space-field">
          <label htmlFor={id}>
            {field.label}
            {field.required ? " *" : ""}
          </label>
          <input
            id={id}
            type="text"
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );
  }
}
