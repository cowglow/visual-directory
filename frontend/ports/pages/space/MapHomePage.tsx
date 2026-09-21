import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  clearSpaceSession,
  fetchLocationsRevalidated,
  getSpaceSession,
  setSpaceSession,
  spaceApiFetch,
  SpaceApiError,
  SpaceEventEndedError,
  type SpaceSession,
} from "infrastructure/api/space-api-client.ts";
import type { Space, SpaceLocation } from "domain/space/space.types.ts";
import { clearSpaceCache, readCachedLocations, writeCachedLocations } from "infrastructure/space-cache/location-cache.ts";
import PinPlacement from "ports/pages/space/PinPlacement.tsx";
import LocationForm from "ports/pages/space/LocationForm.tsx";
import LocationsMapView from "ports/pages/space/LocationsMapView.tsx";
import LocationsListView from "ports/pages/space/LocationsListView.tsx";
import InvitePanel from "ports/pages/space/InvitePanel.tsx";
import RemoveMeDialog from "ports/pages/space/RemoveMeDialog.tsx";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import "./space-pages.css";

type Mode = "view" | "placing" | "form";

export default function MapHomePage() {
  const { spaceSlug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const [space, setSpace] = useState<Space | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [session, setSession] = useState<SpaceSession | null>(() => getSpaceSession(spaceSlug));
  const [eventEnded, setEventEnded] = useState(false);

  const [email, setEmail] = useState("");
  const [magicLinkStatus, setMagicLinkStatus] = useState<"idle" | "pending" | "sent" | "failed">("idle");
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);

  const [locations, setLocations] = useState<SpaceLocation[] | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");

  const [mode, setMode] = useState<Mode>("view");
  const [placedCoords, setPlacedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showRemoveMe, setShowRemoveMe] = useState(false);

  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Public, no session needed - just to show its name and to 404 cleanly on a
  // bad link.
  useEffect(() => {
    let cancelled = false;
    spaceApiFetch<{ space: Space }>(null, `/spaces/${spaceSlug}`)
      .then((result) => {
        if (!cancelled) setSpace(result.space);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SpaceEventEndedError) {
          setEventEnded(true);
          clearSpaceCache(spaceSlug);
          return;
        }
        setSpaceError(err instanceof SpaceApiError ? err.message : "Couldn't load this space.");
      });
    return () => {
      cancelled = true;
    };
  }, [spaceSlug]);

  // A returning-participant magic-link landing (?token=): verify and store
  // the session. Invite-acceptance is a *different* route/page
  // (InviteAcceptPage.tsx) since it needs the consent step first.
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
    setSearchParams((params) => {
      params.delete("token");
      return params;
    });
    spaceApiFetch<{ token: string; participant: SpaceSession }>(spaceSlug, `/spaces/${spaceSlug}/verify`, {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((result) => {
        const next = {
          token: result.token,
          participantId: result.participant.participantId,
          email: result.participant.email,
          role: result.participant.role,
        };
        setSpaceSession(spaceSlug, next);
        setSession(next);
      })
      .catch(() => {
        setMagicLinkError(t.spaceApp.signInFailed);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TASK.md section 6: serve the IndexedDB cache first, then revalidate with
  // a conditional (ETag/If-None-Match) request - on a 304 the cache is
  // already correct and nothing re-renders with new data; on a real change
  // the fresh copy replaces both the on-screen state and the cache. Called on
  // session start (once per session, satisfying that half of "at most once
  // per session or per N hours"), after the user's own create/edit/delete
  // (loadLocations() below), and from the explicit refresh button.
  const loadLocations = useCallback(async () => {
    if (!session) return;
    const cached = await readCachedLocations(spaceSlug);
    try {
      const result = await fetchLocationsRevalidated(spaceSlug, cached?.etag ?? null);
      if (result.status === "ok") {
        setLocations(result.locations);
        await writeCachedLocations(spaceSlug, result.locations, result.etag);
      } else if (cached) {
        setLocations(cached.locations);
      }
    } catch (err) {
      if (err instanceof SpaceEventEndedError) {
        setEventEnded(true);
        await clearSpaceCache(spaceSlug);
        setSession(null);
        return;
      }
      if (err instanceof SpaceApiError && err.status === 401) {
        await clearSpaceCache(spaceSlug);
        setSession(null);
        return;
      }
      // Offline/unreachable: serve the last-known cache rather than an error
      // screen.
      if (cached) {
        setLocations(cached.locations);
      } else {
        setLocationsError(err instanceof SpaceApiError ? err.message : "Couldn't load pins.");
      }
    }
  }, [session, spaceSlug]);

  useEffect(() => {
    if (!session) return;
    readCachedLocations(spaceSlug).then((cached) => {
      if (cached) setLocations(cached.locations);
    });
    void loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, spaceSlug]);

  const myLocation = useMemo(
    () => locations?.find((location) => location.participantId === session?.participantId) ?? null,
    [locations, session],
  );

  const handleRequestLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setMagicLinkStatus("pending");
    setMagicLinkError(null);
    try {
      const result = await spaceApiFetch<{ message: string; devToken?: string }>(null, `/spaces/${spaceSlug}/magic-link`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (result.devToken) {
        const verifyResult = await spaceApiFetch<{ token: string; participant: SpaceSession }>(
          spaceSlug,
          `/spaces/${spaceSlug}/verify`,
          { method: "POST", body: JSON.stringify({ token: result.devToken }) },
        );
        const next = {
          token: verifyResult.token,
          participantId: verifyResult.participant.participantId,
          email: verifyResult.participant.email,
          role: verifyResult.participant.role,
        };
        setSpaceSession(spaceSlug, next);
        setSession(next);
        setMagicLinkStatus("idle");
      } else {
        setMagicLinkStatus("sent");
      }
    } catch (err) {
      setMagicLinkStatus("failed");
      setMagicLinkError(err instanceof SpaceApiError ? err.message : t.spaceApp.signInFailed);
    }
  };

  const handleSignOut = () => {
    clearSpaceSession(spaceSlug);
    clearSpaceCache(spaceSlug);
    setSession(null);
    setLocations(null);
  };

  const handleConfirmPlacement = (coords: { lat: number; lng: number }) => {
    setPlacedCoords(coords);
    setMode("form");
  };

  const handleSaveLocation = async (input: { label: string; note: string }) => {
    if (!placedCoords) return;
    setSavingLocation(true);
    setSaveError(null);
    try {
      const method = myLocation ? "PATCH" : "POST";
      const path = myLocation ? `/spaces/${spaceSlug}/locations/${myLocation.id}` : `/spaces/${spaceSlug}/locations`;
      await spaceApiFetch(spaceSlug, path, { method, body: JSON.stringify({ ...input, ...placedCoords }) });
      setMode("view");
      setPlacedCoords(null);
      loadLocations();
    } catch (err) {
      setSaveError(err instanceof SpaceApiError ? err.message : t.spaceApp.saveFailed);
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeletePin = async () => {
    if (!myLocation) return;
    if (!window.confirm(`${t.spaceApp.confirmDeletePinTitle}\n${t.spaceApp.confirmDeletePinMessage}`)) return;
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/locations/${myLocation.id}`, { method: "DELETE" });
      loadLocations();
    } catch {
      setSaveError(t.spaceApp.saveFailed);
    }
  };

  const handleRemoveMe = async () => {
    await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/me`, { method: "DELETE" });
    clearSpaceSession(spaceSlug);
    clearSpaceCache(spaceSlug);
    setSession(null);
    setLocations(null);
    setShowRemoveMe(false);
  };

  if (eventEnded) {
    return (
      <div className="space-page window">
        <p>{t.spaceApp.eventEnded}</p>
      </div>
    );
  }

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
        <p>{t.spaceApp.loading}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-page window">
        <p>
          <a href={import.meta.env.BASE_URL}>{t.spaceApp.backToDirectory}</a>
        </p>
        <h1>{space.name}</h1>
        {magicLinkStatus === "sent" ? (
          <p className="space-status">{t.spaceApp.signInSent}</p>
        ) : (
          <form onSubmit={handleRequestLink}>
            <div className="space-field">
              <label htmlFor="space-email">{t.spaceApp.signInEmail}</label>
              <input id="space-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <button type="submit" className="btn" disabled={magicLinkStatus === "pending"}>
              {t.spaceApp.signInSubmit}
            </button>
            {magicLinkStatus === "failed" ? <p className="space-error">{magicLinkError}</p> : null}
          </form>
        )}
        {magicLinkError && magicLinkStatus !== "failed" ? <p className="space-error">{magicLinkError}</p> : null}
        <p>
          <a href={spacePaths.privacy(spaceSlug)}>{t.spaceApp.privacyLink}</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-page window">
      <p>
        <a href={import.meta.env.BASE_URL}>{t.spaceApp.backToDirectory}</a>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h1>
          {space.name}
          <span className="space-badge">
            {session.role === "participant" ? t.spaceApp.participantBadge : t.spaceApp.visitorBadge}
          </span>
        </h1>
        <button type="button" className="btn" onClick={handleSignOut}>
          {t.spaceApp.signOut}
        </button>
      </div>

      {offline ? <p className="space-error">{t.spaceApp.offline}</p> : null}

      {mode === "placing" ? (
        <PinPlacement
          initial={myLocation ?? undefined}
          onConfirm={handleConfirmPlacement}
          onCancel={() => setMode("view")}
        />
      ) : mode === "form" && placedCoords ? (
        <LocationForm
          spaceSlug={spaceSlug}
          initialLabel={myLocation?.label}
          initialNote={myLocation?.note}
          onSubmit={handleSaveLocation}
          onCancel={() => setMode("view")}
          submitting={savingLocation}
          error={saveError}
        />
      ) : (
        <>
          <div className="space-view-toggle" role="group" aria-label={t.spaceApp.mapView}>
            <button type="button" className="btn" aria-pressed={view === "map"} onClick={() => setView("map")}>
              {t.spaceApp.mapView}
            </button>
            <button type="button" className="btn" aria-pressed={view === "list"} onClick={() => setView("list")}>
              {t.spaceApp.listView}
            </button>
            <button type="button" className="btn" onClick={() => void loadLocations()} aria-label={t.common.retry}>
              ↻
            </button>
          </div>

          {locationsError ? <p className="space-error">{locationsError}</p> : null}
          {locations === null ? (
            <p>{t.spaceApp.loading}</p>
          ) : view === "map" ? (
            <LocationsMapView locations={locations} ownParticipantId={session.participantId} />
          ) : (
            <LocationsListView locations={locations} ownParticipantId={session.participantId} />
          )}

          {session.role === "participant" ? (
            <div className="space-my-pin">
              <h2>{t.spaceApp.myPinTitle}</h2>
              {myLocation ? (
                <div className="space-placement-actions">
                  <button type="button" className="btn" onClick={() => setMode("placing")}>
                    {t.spaceApp.editPin}
                  </button>
                  <button type="button" className="btn" onClick={handleDeletePin}>
                    {t.spaceApp.deletePin}
                  </button>
                </div>
              ) : (
                <button type="button" className="btn" onClick={() => setMode("placing")}>
                  {t.spaceApp.addPin}
                </button>
              )}
              {saveError ? <p className="space-error">{saveError}</p> : null}
            </div>
          ) : null}

          {session.role === "participant" ? (
            <div className="space-invite-section">
              <button type="button" className="btn" onClick={() => setShowInvitePanel((value) => !value)}>
                {t.spaceApp.inviteTitle}
              </button>
              {showInvitePanel ? <InvitePanel spaceSlug={spaceSlug} /> : null}
            </div>
          ) : null}

          <p>
            <a href={spacePaths.privacy(spaceSlug)}>{t.spaceApp.privacyLink}</a>
          </p>
          <button type="button" className="btn" onClick={() => setShowRemoveMe(true)}>
            {t.spaceApp.removeMeButton}
          </button>
        </>
      )}

      {showRemoveMe ? <RemoveMeDialog onConfirm={handleRemoveMe} onClose={() => setShowRemoveMe(false)} /> : null}
    </div>
  );
}
