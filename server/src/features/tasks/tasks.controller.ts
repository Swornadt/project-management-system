import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type {
  TaskResponse,
  CreateTaskDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
  AssignTaskDto,
} from "./tasks.dto";
import { taskService } from "./tasks.service";
import { HttpError } from "../../shared/middleware/error.middleware";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

function withOverdue(task: any): TaskResponse {
  const isOverdue =
    !!task.due_date &&
    !["done", "cancelled"].includes(task.status) &&
    new Date(task.due_date) < new Date(new Date().toDateString());
  return { ...task, is_overdue: isOverdue };
}

export async function findAllTasksForProject(
  req: Request<{ projectId: string }>,
  res: Response<ApiResponse<TaskResponse[]>>,
  _next: NextFunction
) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
  const sortOrder =
    req.query.sortOrder === "asc" || req.query.sortOrder === "desc"
      ? req.query.sortOrder
      : undefined;

  const filters = {
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    priority: typeof req.query.priority === "string" ? req.query.priority : undefined,
    assignee_id: typeof req.query.assignee_id === "string" ? req.query.assignee_id : undefined,
    label: typeof req.query.label === "string" ? req.query.label : undefined,
    overdue: req.query.overdue === "true",
  };

  const page = await taskService.findAllForProject(
    req.params.projectId,
    filters,
    { limit, offset },
    { sortBy, sortOrder }
  );

  res.status(200).json({
    success: true,
    statusCode: 200,
    data: page.items.map(withOverdue),
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      count: page.count,
    },
  });
}

export async function findOneTask(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<TaskResponse>>,
  next: NextFunction
) {
  const item = await taskService.findOne(req.params.id);
  if (!item) {
    next(new HttpError(404, "Task not found"));
    return;
  }
  res.status(200).json({ success: true, statusCode: 200, data: withOverdue(item) });
}

export async function findSubtasks(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<TaskResponse[]>>,
  _next: NextFunction
) {
  const items = await taskService.listSubtasks(req.params.id);
  res.status(200).json({ success: true, statusCode: 200, data: items.map(withOverdue) });
}

export async function createTask(
  req: Request<unknown, unknown, CreateTaskDto>,
  res: Response<ApiResponse<TaskResponse>>,
  next: NextFunction
) {
  const required = ["project_id", "title"] as const;
  for (const field of required) {
    if (!req.body[field]) {
      next(new HttpError(400, `Field '${field}' is required`));
      return;
    }
  }
  const createdBy = (req as AuthRequest).user!.userId;
  try {
    const created = await taskService.create({ ...req.body, created_by: createdBy });
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Task created",
      data: withOverdue(created),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(
  req: Request<{ id: string }, unknown, UpdateTaskDto>,
  res: Response<ApiResponse<TaskResponse>>,
  next: NextFunction
) {
  const updated = await taskService.update(req.params.id, req.body);
  if (!updated) {
    next(new HttpError(404, "Task not found"));
    return;
  }
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Task updated",
    data: withOverdue(updated),
  });
}

export async function updateTaskStatus(
  req: Request<{ id: string }, unknown, UpdateTaskStatusDto>,
  res: Response<ApiResponse<TaskResponse>>,
  next: NextFunction
) {
  if (!req.body.status) {
    next(new HttpError(400, "Field 'status' is required"));
    return;
  }
  const actingUser = (req as AuthRequest).user!;
  try {
    const updated = await taskService.updateStatus(
      req.params.id,
      req.body.status,
      actingUser.userId,
      actingUser.roleName
    );
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Task status updated",
      data: withOverdue(updated),
    });
  } catch (err) {
    next(err);
  }
}

export async function assignTask(
  req: Request<{ id: string }, unknown, AssignTaskDto>,
  res: Response<ApiResponse<TaskResponse>>,
  next: NextFunction
) {
  if (req.body.assignee_id === undefined) {
    next(new HttpError(400, "Field 'assignee_id' is required (use null to unassign)"));
    return;
  }
  const actingUserId = (req as AuthRequest).user!.userId;
  try {
    const updated = await taskService.assign(req.params.id, req.body.assignee_id, actingUserId);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: req.body.assignee_id ? "Task assigned" : "Task unassigned",
      data: withOverdue(updated),
    });
  } catch (err) {
    next(err);
  }
}

export async function removeTask(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  const deleted = await taskService.remove(req.params.id);
  if (!deleted) {
    next(new HttpError(404, "Task not found"));
    return;
  }
  res.status(200).json({ success: true, statusCode: 200, message: "Task deleted", data: true });
}
