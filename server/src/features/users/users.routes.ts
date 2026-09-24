import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import { authenticate, authorize } from "../../shared/middleware/auth.middleware";
import {
  createUser,
  findAllUsers,
  findOneUser,
  removeUser,
  updateUser,
  searchUsers,
  getUserStats,
  changeUserRole,
  updateUserStatus,
  deactivateUser,
  activateUser,
  restoreUser,
  updateOwnProfile,
} from "./users.controller";

export const usersRouter = Router();

usersRouter.get(
  "/stats",
  authenticate,
  authorize("Admin"),
  asyncHandler(getUserStats)
);

usersRouter.get(
  "/search",
  authenticate,
  authorize("Admin", "Manager"),
  asyncHandler(searchUsers)
);

usersRouter.get(
  "/",
  authenticate,
  authorize("Admin"),
  asyncHandler(findAllUsers)
);

usersRouter.get(
  "/:id",
  authenticate,
  authorize("Admin", "Manager"),
  asyncHandler(findOneUser as any)
);

usersRouter.post(
  "/",
  authenticate,
  authorize("Admin"),
  asyncHandler(createUser)
);

usersRouter.patch(
  "/profile",
  authenticate,
  asyncHandler(updateOwnProfile)
);

usersRouter.patch(
  "/:id",
  authenticate,
  authorize("Admin"),
  asyncHandler(updateUser as any)
);

usersRouter.patch(
  "/:id/role",
  authenticate,
  authorize("Admin"),
  asyncHandler(changeUserRole as any)
);

usersRouter.patch(
  "/:id/status",
  authenticate,
  authorize("Admin"),
  asyncHandler(updateUserStatus as any)
);

usersRouter.patch(
  "/:id/deactivate",
  authenticate,
  authorize("Admin"),
  asyncHandler(deactivateUser as any)
);

usersRouter.patch(
  "/:id/activate",
  authenticate,
  authorize("Admin"),
  asyncHandler(activateUser as any)
);

usersRouter.patch(
  "/:id/restore",
  authenticate,
  authorize("Admin"),
  asyncHandler(restoreUser as any)
);

usersRouter.delete(
  "/:id",
  authenticate,
  authorize("Admin"),
  asyncHandler(removeUser as any)
);
