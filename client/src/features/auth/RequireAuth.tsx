import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

// STOPGAP: checks only whether an access token exists in localStorage, not
// whether it's valid or expired (there's no auth context yet to ask — see
// the //todo in LoginPage.tsx/AuthCard.tsx). A 401 from an expired token is
// still handled at the request level, wherever that's implemented; this
// guard only stops an obviously-logged-out visitor from seeing protected
// screens and sends them to /login instead.
export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem("accessToken"));

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
