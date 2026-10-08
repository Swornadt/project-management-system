import { axiosClient } from "./axiosClient";
import type { ApiResponse } from "./types";

// Public (no login needed) auth endpoints; bodies mirror auth.dto.ts.
export const authFlowApi = {
  verifyEmail: (token: string) =>
    axiosClient
      .post<ApiResponse<{ message: string }>>("/auth/verify-email", { token })
      .then((res) => res.data),

  forgotPassword: (email: string) =>
    axiosClient
      .post<ApiResponse<{ message: string }>>("/auth/forgot-password", { email })
      .then((res) => res.data),

  resetPassword: (token: string, password: string) =>
    axiosClient
      .post<ApiResponse<{ message: string }>>("/auth/reset-password", { token, password })
      .then((res) => res.data),
};

/** Pulls the server's error message out of an axios error, with a fallback. */
export function authErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  }
  return fallback;
}
