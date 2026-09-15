import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  clearSpaceSession,
  getSpaceSession,
  setSpaceSession,
  spaceApiFetch,
  SpaceApiError,
} from "infrastructure/api/space-api-client.ts";
import type { FieldDef, OptInEvent, Space } from "domain/space/space.types.ts";
import EventFieldEditor from "ports/pages/space/EventFieldEditor.tsx";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import "./space-pages.css";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const DEFAULT_FIELDS: FieldDef[] = [
  { key: "address", label: "Address", type: "address", required: true },
  { key: "note", label: "Note", type: "textarea" },
];

export default function SpaceHomePage() {
  const { spaceSlug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [space, setSpace] = useState<Space | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [session, setSession] = useState(() => getSpaceSession(spaceSlug));

  const [email, setEmail] = useState("");
  const [magicLinkStatus, setMagicLinkStatus] = useState<"idle" | "pending" | "sent" | "failed">("idle");
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);

  const [events, setEvents] = useState<OptInEvent[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("");
  const [fields, setFields] = useState<FieldDef[]>(DEFAULT_FIELDS);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);

  // Load the space itself - public, no session needed, just to show its name
  // and to 404 cleanly on a bad link.
  useEffect(() => {
    let cancelled = false;
    spaceApiFetch<{ space: Space }>(null, `/spaces/${spaceSlug}`)
      .then((result) => {
        if (!cancelled) setSpace(result.space);
      })
      .catch((err) => {
        if (!cancelled) setSpaceError(err instanceof SpaceApiError ? err.message : "Couldn't load this space.");
      });
    return () => {
      cancelled = true;
    };
  }, [spaceSlug]);

  // A magic-link landing: verify the token in the URL, store the session, and
  // strip it from the address bar (single-use, nothing to reload from it).
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
    setSearchParams((params) => {
      params.delete("token");
      return params;
    });
    spaceApiFetch<{ token: string; participant: { id: string; email: string } }>(
      spaceSlug,
      `/spaces/${spaceSlug}/verify`,
      { method: "POST", body: JSON.stringify({ token }) },
    )
      .then((result) => {
        const next = { token: result.token, participantId: result.participant.id, email: result.participant.email };
        setSpaceSession(spaceSlug, next);
        setSession(next);
      })
      .catch(() => {
        setMagicLinkError("That sign-in link is invalid or expired. Please request a new one.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once signed in, load this space's events.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    spaceApiFetch<{ events: OptInEvent[] }>(session ? spaceSlug : null, `/spaces/${spaceSlug}/events`)
      .then((result) => {
        if (!cancelled) setEvents(result.events);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SpaceApiError && err.status === 401) {
          setSession(null);
          return;
        }
        setEventsError(err instanceof SpaceApiError ? err.message : "Couldn't load events.");
      });
    return () => {
      cancelled = true;
    };
  }, [session, spaceSlug]);

  const handleRequestLink = async (event: FormEvent) => {
    event.preventDefault();
    setMagicLinkStatus("pending");
    setMagicLinkError(null);
    try {
      const result = await spaceApiFetch<{ message: string; devToken?: string }>(
        null,
        `/spaces/${spaceSlug}/magic-link`,
        { method: "POST", body: JSON.stringify({ email }) },
      );
      if (result.devToken) {
        // Dev/local convenience, same idea as the directory's LoginForm - skip
        // straight to signed-in instead of needing the server console.
        const verifyResult = await spaceApiFetch<{ token: string; participant: { id: string; email: string } }>(
          spaceSlug,
          `/spaces/${spaceSlug}/verify`,
          { method: "POST", body: JSON.stringify({ token: result.devToken }) },
        );
        const next = {
          token: verifyResult.token,
          participantId: verifyResult.participant.id,
          email: verifyResult.participant.email,
        };
        setSpaceSession(spaceSlug, next);
        setSession(next);
        setMagicLinkStatus("idle");
      } else {
        setMagicLinkStatus("sent");
      }
    } catch (err) {
      setMagicLinkStatus("failed");
      setMagicLinkError(err instanceof SpaceApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  const handleSignOut = () => {
    clearSpaceSession(spaceSlug);
    setSession(null);
    setEvents(null);
  };

  const handleCreateEvent = async (event: FormEvent) => {
    event.preventDefault();
    setCreatingEvent(true);
    setCreateEventError(null);
    try {
      const result = await spaceApiFetch<{ event: OptInEvent }>(spaceSlug, `/spaces/${spaceSlug}/events`, {
        method: "POST",
        body: JSON.stringify({ slug: slugify(title), title, kind: kind || "opt-in", fieldSchema: fields }),
      });
      navigate(spacePaths.event(spaceSlug, result.event.slug));
    } catch (err) {
      setCreateEventError(err instanceof SpaceApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setCreatingEvent(false);
    }
  };

  if (spaceError) {
    return (
      <div className="space-page window">
        <p className="space-error">{spaceError}</p>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="space-page window">
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-page window">
        <p>
          <a href={import.meta.env.BASE_URL}>&larr; Back to the directory</a>
        </p>
        <h1>{space.name}</h1>
        {magicLinkStatus === "sent" ? (
          <p className="space-status">Check your email for a sign-in link.</p>
        ) : (
          <form onSubmit={handleRequestLink}>
            <div className="space-field">
              <label htmlFor="space-email">Sign in with your email</label>
              <input
                id="space-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn" disabled={magicLinkStatus === "pending"}>
              Send sign-in link
            </button>
            {magicLinkStatus === "failed" ? <p className="space-error">{magicLinkError}</p> : null}
          </form>
        )}
        {magicLinkError && magicLinkStatus !== "failed" ? <p className="space-error">{magicLinkError}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-page window">
      <p>
        <a href={import.meta.env.BASE_URL}>&larr; Back to the directory</a>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>{space.name}</h1>
        <button type="button" className="btn" onClick={handleSignOut}>
          Sign out
        </button>
      </div>

      <h2>Sign-ups</h2>
      {eventsError ? <p className="space-error">{eventsError}</p> : null}
      {events === null ? (
        <p>Loading…</p>
      ) : events.length === 0 ? (
        <p>No sign-ups yet in this space.</p>
      ) : (
        <ul className="space-entry-list">
          {events.map((evt) => (
            <li key={evt.id} className="space-entry">
              <Link to={spacePaths.event(spaceSlug, evt.slug)}>{evt.title}</Link>
              <span className="space-entry-detail">{evt.kind}</span>
            </li>
          ))}
        </ul>
      )}

      {showCreateEvent ? (
        <form onSubmit={handleCreateEvent} style={{ marginTop: "1.5rem" }}>
          <h3>New sign-up</h3>
          <div className="space-field">
            <label htmlFor="event-title">Title</label>
            <input id="event-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-field">
            <label htmlFor="event-kind">Kind</label>
            <input
              id="event-kind"
              type="text"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              placeholder="e.g. trick-or-treat, block-party, volunteer"
            />
          </div>
          <EventFieldEditor fields={fields} onChange={setFields} />
          <button type="submit" className="btn" disabled={creatingEvent}>
            {creatingEvent ? "Creating…" : "Create sign-up"}
          </button>
          {createEventError ? <p className="space-error">{createEventError}</p> : null}
        </form>
      ) : (
        <button type="button" className="btn" onClick={() => setShowCreateEvent(true)}>
          + New sign-up
        </button>
      )}
    </div>
  );
}
