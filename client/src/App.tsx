import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ContentDashboard from "./features/content/ContentDashboard";
import { RequireAuth } from "./features/auth/RequireAuth";
import AuthPage from "./pages/AuthPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { NAV_PATHS, DEFAULT_NAV } from "./routes/navPaths";
import UserManagement from "./pages/UserManagement";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth pages — the emailed links land on verify-email and reset-password. */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<AuthPage />} />
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

        {/* Project details. Rendered by the same shell as every other section;
            ContentDashboard maps the :projectId param to the projects nav key. */}
        <Route
          path="/projects/:projectId"
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
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route path="/users" element={<Navigate to="/admin/users" replace />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
