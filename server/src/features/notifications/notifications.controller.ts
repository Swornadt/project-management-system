import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type { NotificationResponse } from "./notifications.dto";
import { notificationsService } from "./notifications.service";
import { HttpError } from "../../shared/middleware/error.middleware";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export async function findMyNotifications(
  req: Request,
  res: Response<ApiResponse<NotificationResponse[]>>,
  _next: NextFunction
) {
  const userId = (req as AuthRequest).user!.userId;

  const isReadParam = req.query.is_read;
  const filters = {
    is_read:
      isReadParam === "true" ? true : isReadParam === "false" ? false : undefined,
    type: typeof req.query.type === "string" ? req.query.type : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined,
  };

  const page = await notificationsService.listForUser(userId, filters);

  res.status(200).json({
    success: true,
    statusCode: 200,
    data: page.items as unknown as NotificationResponse[],
    meta: { total: page.total, limit: page.limit, offset: page.offset, count: page.count },
  });
}

export async function getUnreadCount(
  req: Request,
  res: Response<ApiResponse<{ unread_count: number }>>,
  _next: NextFunction
) {
  const userId = (req as AuthRequest).user!.userId;
  const unread_count = await notificationsService.unreadCount(userId);
  res.status(200).json({ success: true, statusCode: 200, data: { unread_count } });
}

export async function markNotificationRead(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<NotificationResponse>>,
  next: NextFunction
) {
  const userId = (req as AuthRequest).user!.userId;
  try {
    const updated = await notificationsService.markAsRead(req.params.id, userId);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Notification marked as read",
      data: updated as unknown as NotificationResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(
  req: Request,
  res: Response<ApiResponse<{ updated: number }>>,
  _next: NextFunction
) {
  const userId = (req as AuthRequest).user!.userId;
  const result = await notificationsService.markAllAsRead(userId);
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: `${result.updated} notification(s) marked as read`,
    data: result,
  });
}

export async function removeNotification(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  const userId = (req as AuthRequest).user!.userId;
  try {
    const deleted = await notificationsService.remove(req.params.id, userId);
    if (!deleted) {
      next(new HttpError(404, "Notification not found"));
      return;
    }
    res.status(200).json({ success: true, statusCode: 200, message: "Notification deleted", data: true });
  } catch (err) {
    next(err);
  }
}
