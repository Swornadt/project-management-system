import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
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

authRouter.post("/register", registrationRateLimit, asyncHandler(register as any));
authRouter.post("/verify-email", asyncHandler(verifyEmail as any));
authRouter.post("/login", loginRateLimit, asyncHandler(login as any));
authRouter.post("/refresh", asyncHandler(refresh as any));
authRouter.post("/logout", asyncHandler(logout as any));
authRouter.post("/forgot-password", passwordResetRateLimit, asyncHandler(forgotPassword as any));
authRouter.post("/reset-password", asyncHandler(resetPassword as any));
authRouter.post("/change-password", authenticate, asyncHandler(changePassword as any));
authRouter.get("/me", authenticate, asyncHandler(getProfile as any));
