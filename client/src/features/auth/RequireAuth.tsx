import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { getStoredUser, setStoredUser } from "../../api/axiosClient";
import { sessionApi } from "../../api/session";

// STOPGAP: checks only whether an access token exists in localStorage, not
// whether it's valid or expired. A 401 from an expired token is handled at
// the request level (axiosClient). This guard stops an obviously-logged-out
// visitor from seeing protected screens and sends them to /login instead.
//
// It also makes sure the current user is in localStorage before children
// render: pages decide what to show by role (getStoredUser), and sessions
// created before the user was stored would otherwise look like "no role".
export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem("accessToken"));
  const [ready, setReady] = useState(() => Boolean(getStoredUser()));

  useEffect(() => {
    if (!hasToken || ready) return;
    let cancelled = false;
    sessionApi
      .me()
      .then((user) => setStoredUser(user))
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasToken, ready]);

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5d5b54] text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return <>{children}</>;
}
