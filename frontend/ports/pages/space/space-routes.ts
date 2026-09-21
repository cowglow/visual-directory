// Spaces is its own build entry (frontend/spaces-main.tsx, served at
// /visual-directory/spaces/) with its own dedicated HashRouter - SpaceApp
// mounts at that router's true root, so unlike when this lived as a "/s/*"
// route inside the directory app's own router, these paths need no prefix.
// Routing every navigate()/<Link to> through these functions still keeps the
// actual URL shape defined in exactly one place.
//
// There's no more "create a space" route (TASK.md section 2: "NO public
// access" - a space's first participant comes from `pnpm seed:space`, see
// docs/WORKLOG.md), so `/` redirects to the one deployed space rather than
// showing a form - see App.tsx's default-space redirect.
export const spacePaths = {
  home: (spaceSlug: string) => `/${spaceSlug}`,
  invite: (spaceSlug: string) => `/${spaceSlug}/invite`,
  privacy: (spaceSlug: string) => `/${spaceSlug}/privacy`,
};

// The one space this deployment serves - single-purpose app (TASK.md section
// 1's pivot), not the old multi-space self-serve product. Configurable so the
// same build can be repointed at a different space slug another year without
// a code change.
export const DEFAULT_SPACE_SLUG = import.meta.env.VITE_SPACE_SLUG ?? "meckenhausen";
