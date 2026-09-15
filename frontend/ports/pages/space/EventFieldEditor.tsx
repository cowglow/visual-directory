import type { FieldDef, FieldType } from "domain/space/space.types.ts";
import "./space-pages.css";

interface EventFieldEditorProps {
  fields: FieldDef[];
  onChange: (fields: FieldDef[]) => void;
}

const FIELD_TYPES: FieldType[] = ["address", "text", "textarea", "boolean", "select", "time-range"];

function keyify(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "") || "field"
  );
}

// The UI half of "define what fields an opt-in needs without hardcoding a new
// form" - each row is one FieldDef, sent to POST /spaces/:slug/events as-is
// and later used by DynamicField to render the actual sign-up form.
export default function EventFieldEditor({ fields, onChange }: EventFieldEditorProps) {
  const updateField = (index: number, patch: Partial<FieldDef>) => {
    const next = fields.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addField = () => {
    onChange([...fields, { key: `field_${fields.length + 1}`, label: "", type: "text" }]);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-field">
      <label>What information should this sign-up collect?</label>
      {fields.map((field, index) => (
        <div key={index} className="space-field-row">
          <input
            type="text"
            aria-label="Field label"
            placeholder="Label (e.g. Address)"
            value={field.label}
            onChange={(event) => updateField(index, { label: event.target.value, key: keyify(event.target.value) })}
          />
          <select
            aria-label="Field type"
            value={field.type}
            onChange={(event) => updateField(index, { type: event.target.value as FieldType })}
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {field.type === "select" ? (
            <input
              type="text"
              aria-label="Options"
              placeholder="Options, comma separated"
              value={(field.options ?? []).join(", ")}
              onChange={(event) =>
                updateField(index, { options: event.target.value.split(",").map((o) => o.trim()).filter(Boolean) })
              }
            />
          ) : null}
          <label style={{ flex: "none", display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="checkbox"
              checked={Boolean(field.required)}
              onChange={(event) => updateField(index, { required: event.target.checked })}
            />
            required
          </label>
          <button type="button" className="btn space-field-remove" onClick={() => removeField(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn" onClick={addField}>
        + Add field
      </button>
      <p className="hint">Tip: an "address" field is used to sort and print the shared list, and lets people fill it in from their current location.</p>
    </div>
  );
}
