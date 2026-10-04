import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { getAllRoles } from "./roles.controller";

export const rolesRouter = Router();

rolesRouter.get(
  "/",
  authenticate,
  asyncHandler(getAllRoles)
);
