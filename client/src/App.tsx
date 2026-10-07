import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ContentDashboard from "./features/content/ContentDashboard";
import LoginPage from "./pages/LoginPage";
import UserManagement from "./pages/UserManagement";
import AdminDashboard from "./pages/AdminDashboard";
import AuditLog from "./pages/AuditLog";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLog />
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
