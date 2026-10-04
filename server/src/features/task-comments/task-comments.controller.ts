import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type {
  TaskCommentResponse,
  CreateTaskCommentDto,
  UpdateTaskCommentDto,
} from "./task-comments.dto";
import { taskCommentService } from "./task-comments.service";
import { HttpError } from "../../shared/middleware/error.middleware";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export async function findCommentsForTask(
  req: Request<{ taskId: string }>,
  res: Response<ApiResponse<TaskCommentResponse[]>>,
  _next: NextFunction
) {
  const items = await taskCommentService.findAllForTask(req.params.taskId);
  res.status(200).json({ success: true, statusCode: 200, data: items as TaskCommentResponse[] });
}

export async function createTaskComment(
  req: Request<unknown, unknown, CreateTaskCommentDto>,
  res: Response<ApiResponse<TaskCommentResponse>>,
  next: NextFunction
) {
  if (!req.body.task_id || !req.body.comment) {
    next(new HttpError(400, "Fields 'task_id' and 'comment' are required"));
    return;
  }
  const userId = (req as AuthRequest).user!.userId;
  try {
    const created = await taskCommentService.create({ ...req.body, user_id: userId });
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Comment added",
      data: created as TaskCommentResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskComment(
  req: Request<{ id: string }, unknown, UpdateTaskCommentDto>,
  res: Response<ApiResponse<TaskCommentResponse>>,
  next: NextFunction
) {
  const userId = (req as AuthRequest).user!.userId;
  const existing = await taskCommentService.findOne(req.params.id);
  if (!existing) {
    next(new HttpError(404, "Comment not found"));
    return;
  }
  if (existing.user_id !== userId) {
    next(new HttpError(403, "You can only edit your own comments"));
    return;
  }
  const updated = await taskCommentService.update(req.params.id, req.body);
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Comment updated",
    data: updated as TaskCommentResponse,
  });
}

export async function removeTaskComment(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  const user = (req as AuthRequest).user!;
  const isPrivileged = user.roleName === "Admin" || user.roleName === "Manager";
  try {
    const deleted = await taskCommentService.removeIfOwnerOrPrivileged(
      req.params.id,
      user.userId,
      isPrivileged
    );
    if (!deleted) {
      next(new HttpError(404, "Comment not found"));
      return;
    }
    res.status(200).json({ success: true, statusCode: 200, message: "Comment deleted", data: true });
  } catch (err) {
    next(err);
  }
}
