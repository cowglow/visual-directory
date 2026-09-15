import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { spaceApiFetch, SpaceApiError } from "infrastructure/api/space-api-client.ts";
import type { Space } from "domain/space/space.types.ts";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import "./space-pages.css";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// The open, self-service entry point to the whole feature: anyone can create
// a Space (a neighborhood/community) - there's no invite step, matching the
// "no moderation yet" decision this feature was built around.
export default function CreateSpacePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await spaceApiFetch<{ space: Space }>(null, "/spaces", {
        method: "POST",
        body: JSON.stringify({ name, slug }),
      });
      navigate(spacePaths.home(result.space.slug));
    } catch (err) {
      setError(err instanceof SpaceApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-page window">
      <p>
        {/* A real cross-bundle navigation, not a client-side route - Spaces is
        its own separate page (see frontend/spaces-main.tsx), so a <Link>
        here would just loop back to this same page instead of leaving it. */}
        <a href={import.meta.env.BASE_URL}>&larr; Back to the directory</a>
      </p>
      <h1>Start a new community page</h1>
      <p>
        Create a shared space for your neighborhood or group. Anyone with the link can join and run opt-in sign-ups
        in it — a Halloween trick-or-treat list, a block party RSVP, whatever you need.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="space-field">
          <label htmlFor="space-name">Community name</label>
          <input
            id="space-name"
            type="text"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="e.g. Maple Street"
            required
          />
        </div>
        <div className="space-field">
          <label htmlFor="space-slug">Link</label>
          <input
            id="space-slug"
            type="text"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(slugify(event.target.value));
            }}
            required
          />
          <p className="hint">Your page will be at .../spaces/#/{slug || "your-link"}</p>
        </div>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Creating…" : "Create community page"}
        </button>
        {error ? <p className="space-error">{error}</p> : null}
      </form>
    </div>
  );
}
