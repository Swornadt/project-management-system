import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type { TaskDependencyResponse, CreateTaskDependencyDto } from "./task-dependencies.dto";
import { taskDependencyService } from "./task-dependencies.service";
import { HttpError } from "../../shared/middleware/error.middleware";

export async function findDependenciesForTask(
  req: Request<{ taskId: string }>,
  res: Response<ApiResponse<{ depends_on: TaskDependencyResponse[]; blocks: TaskDependencyResponse[] }>>,
  _next: NextFunction
) {
  const data = await taskDependencyService.listForTask(req.params.taskId);
  res.status(200).json({ success: true, statusCode: 200, data: data as any });
}

export async function createTaskDependency(
  req: Request<unknown, unknown, CreateTaskDependencyDto>,
  res: Response<ApiResponse<TaskDependencyResponse>>,
  next: NextFunction
) {
  if (!req.body.task_id || !req.body.depends_on_task_id) {
    next(new HttpError(400, "Fields 'task_id' and 'depends_on_task_id' are required"));
    return;
  }
  try {
    const created = await taskDependencyService.create(req.body);
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Dependency created",
      data: created as TaskDependencyResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeTaskDependency(
  req: Request<{ taskId: string; dependsOnTaskId: string }>,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  const deleted = await taskDependencyService.remove(req.params.taskId, req.params.dependsOnTaskId);
  if (!deleted) {
    next(new HttpError(404, "Dependency not found"));
    return;
  }
  res.status(200).json({ success: true, statusCode: 200, message: "Dependency removed", data: true });
}
