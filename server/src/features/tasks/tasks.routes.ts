import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import { authenticate, authorize } from "../../shared/middleware/auth.middleware";
import {
  findAllTasksForProject,
  findOneTask,
  findSubtasks,
  createTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  removeTask,
} from "./tasks.controller";

export const tasksRouter = Router();

tasksRouter.use(authenticate);

// Must be registered before "/:id" — otherwise "/project/:projectId" would
// be swallowed by "/:id" matching "project" as the id.
tasksRouter.get("/project/:projectId", asyncHandler(findAllTasksForProject as any));

tasksRouter.get("/:id", asyncHandler(findOneTask as any));
tasksRouter.get("/:id/subtasks", asyncHandler(findSubtasks as any));

// Creation and (re)assignment are Manager/Admin actions per the SRS §5.2
// permission model — Employees work within tasks already assigned to them.
tasksRouter.post("/", authorize("Admin", "Manager"), asyncHandler(createTask));
tasksRouter.patch("/:id", authorize("Admin", "Manager"), asyncHandler(updateTask as any));
tasksRouter.patch("/:id/assign", authorize("Admin", "Manager"), asyncHandler(assignTask as any));
tasksRouter.delete("/:id", authorize("Admin", "Manager"), asyncHandler(removeTask as any));

// Status updates are open to any authenticated user; the service enforces
// that Employees may only move tasks currently assigned to them.
tasksRouter.patch("/:id/status", asyncHandler(updateTaskStatus as any));
