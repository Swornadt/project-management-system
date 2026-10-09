import axios from "axios";
import {
  axiosClient,
  clearAccessToken,
  clearStoredUser,
  setAccessToken,
  setStoredUser,
} from "./axiosClient";
import type { ApiAuthResponse, ApiUserProfile } from "./authTypes";
import type { ApiResponse } from "./types";

const REFRESH_KEY = "refreshToken";

/** Call after a successful login: keeps the tokens and the user for the rest of the app. */
export function saveSession(auth: ApiAuthResponse) {
  setAccessToken(auth.accessToken);
  setStoredUser(auth.user);
  localStorage.setItem(REFRESH_KEY, auth.refreshToken);
}

export function clearSession() {
  clearAccessToken();
  clearStoredUser();
  localStorage.removeItem("token");
  localStorage.removeItem(REFRESH_KEY);
}

/** Revokes the refresh token on the server (best effort), clears local state, goes to /login. */
export async function signOut() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  try {
    if (refreshToken) await axiosClient.post("/auth/logout", { refreshToken });
  } catch {
    // Offline or already expired — we're clearing the local session either way.
  }
  clearSession();
  window.location.href = "/login";
}

export const sessionApi = {
  me: () =>
    axiosClient
      .get<ApiResponse<{ user: ApiUserProfile }>>("/auth/me")
      .then((res) => res.data.data.user),

  // Deliberately NOT axiosClient: the API answers a wrong current password with
  // 401, and axiosClient's 401 handler would log the user out instead of
  // letting the form show "Current password is incorrect".
  changePassword: (currentPassword: string, newPassword: string) =>
    axios
      .post<ApiResponse<{ message: string }>>(
        "/api/v1/auth/change-password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      )
      .then((res) => res.data),
};
