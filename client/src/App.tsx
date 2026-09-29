import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ContentDashboard from "./features/content/ContentDashboard";
import { RequireAuth } from "./features/auth/RequireAuth";
import { NAV_PATHS, DEFAULT_NAV } from "./routes/navPaths";

// TEMPORARY — routing is being built ahead of the real login page
// (LoginPage.tsx/AuthCard.tsx are still //todo). This exists only so
// RequireAuth has somewhere valid to redirect an unauthenticated visitor.
// Delete this and route to the real <LoginPage /> once it's built; nothing
// else here needs to change when that happens.
function LoginPlaceholder() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f5] text-[#37352f] text-sm">
      <div className="text-center space-y-2">
        <p className="font-semibold">Login page not built yet</p>
        <p className="text-[#5d5b54]">
          For now, set <code className="bg-[#f0eeec] px-1 rounded">accessToken</code> in
          localStorage manually (see devIdentity / earlier session notes).
        </p>
      </div>
    </div>
  );
}

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPlaceholder />} />

        {/* Bare "/" -> the default section's real URL, so the address bar
            always reflects an actual page rather than a redirect target. */}
        <Route path="/" element={<Navigate to={NAV_PATHS[DEFAULT_NAV]} replace />} />

        {/* One dynamic segment covers every sidebar section — the nav key
            is resolved (and validated) inside ContentDashboard via
            resolveNavKey(), so an unknown path falls back to the default
            section instead of rendering blank. */}
        <Route
          path="/:navKey"
          element={
            <RequireAuth>
              <ContentDashboard />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to={NAV_PATHS[DEFAULT_NAV]} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
