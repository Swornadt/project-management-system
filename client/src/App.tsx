import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ContentDashboard from "./features/content/ContentDashboard";
import { RequireAuth } from "./features/auth/RequireAuth";
import LoginPage from "./pages/LoginPage";
import { NAV_PATHS, DEFAULT_NAV } from "./routes/navPaths";
import UserManagement from "./pages/UserManagement";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

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
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ContentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
