// Spaces is its own build entry (frontend/spaces-main.tsx, served at
// /visual-directory/spaces/) with its own dedicated HashRouter - SpaceApp
// mounts at that router's true root, so unlike when this lived as a "/s/*"
// route inside the directory app's own router, these paths need no prefix.
// Routing every navigate()/<Link to> through these functions still keeps the
// actual URL shape defined in exactly one place.
export const spacePaths = {
  create: () => "/",
  home: (spaceSlug: string) => `/${spaceSlug}`,
  event: (spaceSlug: string, eventSlug: string) => `/${spaceSlug}/${eventSlug}`,
};
