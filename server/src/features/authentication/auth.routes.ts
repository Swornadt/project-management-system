import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import {
  loginController,
  logoutController,
  meController,
  registerController,
} from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(registerController));
authRouter.post("/login", asyncHandler(loginController));
authRouter.get("/me", asyncHandler(meController));
authRouter.post("/logout", asyncHandler(logoutController));
