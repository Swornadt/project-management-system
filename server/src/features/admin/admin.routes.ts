import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import { authenticate, authorize } from "../../shared/middleware/auth.middleware";
import { getAdminDashboardStats } from "./admin.controller";

export const adminRouter = Router();

adminRouter.get(
  "/dashboard/stats",
  authenticate,
  authorize("Admin"),
  asyncHandler(getAdminDashboardStats)
);
