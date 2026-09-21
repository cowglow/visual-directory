import { Navigate, Route, Routes } from "react-router-dom";
import MapHomePage from "ports/pages/space/MapHomePage.tsx";
import InviteAcceptPage from "ports/pages/space/InviteAcceptPage.tsx";
import PrivacyNoticePage from "ports/pages/space/PrivacyNoticePage.tsx";
import { DEFAULT_SPACE_SLUG, spacePaths } from "ports/pages/space/space-routes.ts";

// Mounted at its own build entry (frontend/spaces-main.tsx) instead of inside
// the directory's desktop-window app - this feature has its own public,
// non-authenticated-by-the-directory identity model (see
// application/space-token-signer.ts on the backend) and shouldn't inherit the
// menu bar/login gate built for that unrelated trust boundary.
//
// "/" redirects to the one space this deployment serves - there's no more
// self-serve "create a space" page (TASK.md section 2: "NO public access").
export default function SpaceApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={spacePaths.home(DEFAULT_SPACE_SLUG)} replace />} />
      <Route path="/:spaceSlug" element={<MapHomePage />} />
      <Route path="/:spaceSlug/invite" element={<InviteAcceptPage />} />
      <Route path="/:spaceSlug/privacy" element={<PrivacyNoticePage />} />
    </Routes>
  );
}
