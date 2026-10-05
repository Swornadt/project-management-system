import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { instanceToPlain } from "class-transformer";
import { AppDataSource } from "./src/shared/db/data-source";
import { errorHandler, notFoundHandler } from "./src/shared/middleware/error.middleware";

import { authRouter } from "./src/features/authentication/auth.routes";
import { contentsRouter } from "./src/features/contents/content.routes";
import { usersRouter } from "./src/features/users/users.routes";
import { projectRouter } from "./src/features/projects/project.routes";
import { tagsRouter } from "./src/features/tags/tags.routes";
import { tasksRouter } from "./src/features/tasks/tasks.routes";
import { taskCommentsRouter } from "./src/features/task-comments/task-comments.routes";
import { taskDependenciesRouter } from "./src/features/task-dependencies/task-dependencies.routes";
import { notificationsRouter } from "./src/features/notifications/notifications.routes";
import { rolesRouter } from "./src/features/roles/roles.routes";
import { adminRouter } from "./src/features/admin/admin.routes";
import filesRoutes from "./src/features/files/files.routes";
import { approvalsRouter } from "./src/features/approvals/approvals.routes";
import { auditLogsRouter } from "./src/features/audit-logs/audit.routes";
import { startPublishScheduler } from "./src/shared/jobs/publish-scheduled.jobs";

dotenv.config();

export const app = express();
const PORT = Number(process.env.PORT) || 5001;
const API_PREFIX = "/api/v1";

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body: any) => originalJson(instanceToPlain(body));
  next();
});

app.get("/", (_req, res) => {
  res.send("Base API is running");
});

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/admin`, adminRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/projects`, projectRouter);
app.use(`${API_PREFIX}/contents`, contentsRouter);
app.use(`${API_PREFIX}/tags`, tagsRouter);
app.use(`${API_PREFIX}/tasks`, tasksRouter);
app.use(`${API_PREFIX}/task-comments`, taskCommentsRouter);
app.use(`${API_PREFIX}/task-dependencies`, taskDependenciesRouter);
app.use(`${API_PREFIX}/files`, filesRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRouter);
app.use(`${API_PREFIX}/approvals`, approvalsRouter);
app.use(`${API_PREFIX}/audit-logs`, auditLogsRouter);
app.use(`${API_PREFIX}/roles`, rolesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected successfully.");

    startPublishScheduler();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API routes available under ${API_PREFIX}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

if (!process.env.VITEST) {
  startServer();
}