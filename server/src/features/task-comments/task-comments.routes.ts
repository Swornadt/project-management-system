import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import {
  findCommentsForTask,
  createTaskComment,
  updateTaskComment,
  removeTaskComment,
} from "./task-comments.controller";

export const taskCommentsRouter = Router();

taskCommentsRouter.use(authenticate);

taskCommentsRouter.get("/task/:taskId", asyncHandler(findCommentsForTask as any));
taskCommentsRouter.post("/", asyncHandler(createTaskComment));
taskCommentsRouter.patch("/:id", asyncHandler(updateTaskComment as any));
taskCommentsRouter.delete("/:id", asyncHandler(removeTaskComment as any));
