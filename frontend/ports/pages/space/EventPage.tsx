import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSpaceSession, spaceApiFetch, SpaceApiError } from "infrastructure/api/space-api-client.ts";
import type { AddressValue, OptInEntry, OptInEvent } from "domain/space/space.types.ts";
import DynamicField from "ports/pages/space/DynamicField.tsx";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import "./space-pages.css";

function emptyValue(field: OptInEvent["fieldSchema"][number]): unknown {
  if (field.type === "boolean") return false;
  if (field.type === "address") return { text: "", lat: null, lng: null } satisfies AddressValue;
  return "";
}

function emptyData(event: OptInEvent): Record<string, unknown> {
  return Object.fromEntries(event.fieldSchema.map((field) => [field.key, emptyValue(field)]));
}

export default function EventPage() {
  const { spaceSlug = "", eventSlug = "" } = useParams();
  const session = getSpaceSession(spaceSlug);

  const [event, setEvent] = useState<OptInEvent | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [entries, setEntries] = useState<OptInEntry[] | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});

  const loadEntries = () => {
    spaceApiFetch<{ entries: OptInEntry[] }>(spaceSlug, `/spaces/${spaceSlug}/events/${eventSlug}/entries`)
      .then((result) => setEntries(result.entries))
      .catch((err) => setEntriesError(err instanceof SpaceApiError ? err.message : "Couldn't load the list."));
  };

  useEffect(() => {
    if (!session) return;
    spaceApiFetch<{ event: OptInEvent }>(spaceSlug, `/spaces/${spaceSlug}/events/${eventSlug}`)
      .then((result) => {
        setEvent(result.event);
        setFormData(emptyData(result.event));
      })
      .catch((err) => setEventError(err instanceof SpaceApiError ? err.message : "Couldn't load this sign-up."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceSlug, eventSlug]);

  useEffect(() => {
    if (!session || !event) return;
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  if (!session) {
    return (
      <div className="space-page window">
        <p>
          You need to sign in first. <Link to={spacePaths.home(spaceSlug)}>Go to {spaceSlug}</Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!event) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/events/${eventSlug}/entries`, {
        method: "POST",
        body: JSON.stringify({ data: formData }),
      });
      setFormData(emptyData(event));
      loadEntries();
    } catch (err) {
      setSubmitError(err instanceof SpaceApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (entry: OptInEntry) => {
    setEditingId(entry.id);
    setEditData(entry.data);
  };

  const saveEdit = async (entryId: string) => {
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/entries/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({ data: editData }),
      });
      setEditingId(null);
      loadEntries();
    } catch (err) {
      setEntriesError(err instanceof SpaceApiError ? err.message : "Couldn't save your changes.");
    }
  };

  const removeEntry = async (entryId: string) => {
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/entries/${entryId}`, { method: "DELETE" });
      loadEntries();
    } catch (err) {
      setEntriesError(err instanceof SpaceApiError ? err.message : "Couldn't remove your entry.");
    }
  };

  if (eventError) {
    return (
      <div className="space-page window">
        <p className="space-error">{eventError}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-page window">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-page window">
      <p className="no-print">
        <Link to={spacePaths.home(spaceSlug)}>&larr; {spaceSlug}</Link>
      </p>
      <h1>{event.title}</h1>

      <div className="no-print">
        <form onSubmit={handleSubmit}>
          {event.fieldSchema.map((field) => (
            <DynamicField
              key={field.key}
              field={field}
              value={formData[field.key]}
              onChange={(value) => setFormData((current) => ({ ...current, [field.key]: value }))}
            />
          ))}
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Adding…" : "Add my entry"}
          </button>
          {submitError ? <p className="space-error">{submitError}</p> : null}
        </form>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "1.5rem" }}>
        <h2>Who&apos;s participating</h2>
        <button type="button" className="btn no-print" onClick={() => window.print()}>
          Print list
        </button>
      </div>
      {entriesError ? <p className="space-error">{entriesError}</p> : null}
      {entries === null ? (
        <p>Loading…</p>
      ) : entries.length === 0 ? (
        <p>No one has signed up yet — be the first!</p>
      ) : (
        <ul className="space-entry-list">
          {entries.map((entry) => {
            const isOwn = entry.participantId === session.participantId;
            if (editingId === entry.id) {
              return (
                <li key={entry.id} className="space-entry">
                  <div style={{ flex: 1 }}>
                    {event.fieldSchema.map((field) => (
                      <DynamicField
                        key={field.key}
                        field={field}
                        value={editData[field.key]}
                        onChange={(value) => setEditData((current) => ({ ...current, [field.key]: value }))}
                      />
                    ))}
                    <button type="button" className="btn" onClick={() => saveEdit(entry.id)}>
                      Save
                    </button>{" "}
                    <button type="button" className="btn" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </li>
              );
            }
            return (
              <li key={entry.id} className="space-entry">
                <div>
                  <div className="space-entry-address">{entry.addressLabel ?? "—"}</div>
                  {event.fieldSchema
                    // The primary address field is already shown above via
                    // entry.addressLabel - showing it again here would just
                    // repeat the same text (or, worse, print "[object Object]"
                    // for its {text, lat, lng} shape).
                    .filter((field) => field.type !== "address")
                    .map((field) => {
                      const value = entry.data[field.key];
                      if (value === undefined || value === "" || value === false) return null;
                      return (
                        <div key={field.key} className="space-entry-detail">
                          {field.label}: {field.type === "boolean" ? "Yes" : String(value)}
                        </div>
                      );
                    })}
                </div>
                {isOwn ? (
                  <span className="no-print">
                    <button type="button" className="btn" onClick={() => startEdit(entry)}>
                      Edit
                    </button>{" "}
                    <button type="button" className="btn" onClick={() => removeEntry(entry.id)}>
                      Remove
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
