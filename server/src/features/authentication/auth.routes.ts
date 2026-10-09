import { Router } from "express";

import { asyncHandler } from "../../shared/middleware/error.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { requireParams } from "../../shared/middleware/validate.middleware";

import {
  loginRateLimit,
  passwordResetRateLimit,
  registrationRateLimit,
} from "../../shared/middleware/rate-limit.middleware";

import {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
} from "./auth.controller";

export const authRouter = Router();

authRouter.post(
  "/register",
  registrationRateLimit,
  requireParams(["first_name", "last_name", "email", "password"]),
  asyncHandler(register as any)
);

authRouter.post(
  "/verify-email",
  requireParams(["token"]),
  asyncHandler(verifyEmail as any)
);

authRouter.post(
  "/login",
  loginRateLimit,
  requireParams(["email", "password"]),
  asyncHandler(login as any)
);

authRouter.post(
  "/refresh",
  requireParams(["refreshToken"]),
  asyncHandler(refresh as any)
);

authRouter.post(
  "/logout",
  requireParams(["refreshToken"]),
  asyncHandler(logout as any)
);

authRouter.post(
  "/forgot-password",
  passwordResetRateLimit,
  requireParams(["email"]),
  asyncHandler(forgotPassword as any)
);

authRouter.post(
  "/reset-password",
  requireParams(["token", "password"]),
  asyncHandler(resetPassword as any)
);

authRouter.post(
  "/change-password",
  authenticate,
  requireParams(["currentPassword", "newPassword"]),
  asyncHandler(changePassword as any)
);

authRouter.get("/me", authenticate, asyncHandler(getProfile as any));

