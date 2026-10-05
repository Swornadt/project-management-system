import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import {
  findMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
} from "./notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

// Order matters: "/unread-count" and "/read-all" must be registered before
// "/:id", or Express would try to match them as an :id param instead.
notificationsRouter.get("/", asyncHandler(findMyNotifications));
notificationsRouter.get("/unread-count", asyncHandler(getUnreadCount));
notificationsRouter.patch("/read-all", asyncHandler(markAllNotificationsRead));
notificationsRouter.patch("/:id/read", asyncHandler(markNotificationRead as any));
notificationsRouter.delete("/:id", asyncHandler(removeNotification as any));
