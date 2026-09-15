import { Route, Routes } from "react-router-dom";
import CreateSpacePage from "ports/pages/space/CreateSpacePage.tsx";
import SpaceHomePage from "ports/pages/space/SpaceHomePage.tsx";
import EventPage from "ports/pages/space/EventPage.tsx";

// Mounted at /s/* (see frontend/main.tsx) instead of inside the directory's
// desktop-window app - this feature has its own public, non-authenticated-by-
// the-directory identity model (see application/space-token-signer.ts on the
// backend) and shouldn't inherit the menu bar/login gate built for that
// unrelated trust boundary.
export default function SpaceApp() {
  return (
    <Routes>
      <Route path="/" element={<CreateSpacePage />} />
      <Route path="/:spaceSlug" element={<SpaceHomePage />} />
      <Route path="/:spaceSlug/:eventSlug" element={<EventPage />} />
    </Routes>
  );
}
