import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AppDataSource } from "./src/shared/db/data-source";
import { errorHandler, notFoundHandler } from "./src/shared/middleware/error.middleware";

import { authRouter } from "./src/features/authentication/auth.routes";
import { contentsRouter } from "./src/features/contents/content.routes";
import { usersRouter } from "./src/features/users/users.routes";
import { tagsRouter } from "./src/features/tags/tags.routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const API_PREFIX = "/api/v1";

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Base API is running");
});

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/contents`, contentsRouter);
app.use(`${API_PREFIX}/tags`, tagsRouter);
// app.use(`${API_PREFIX}/roles`, rolesRouter);
// app.use(`${API_PREFIX}/projects`, projectsRouter);
// app.use(`${API_PREFIX}/project-members`, projectMembersRouter);
// app.use(`${API_PREFIX}/tasks`, tasksRouter);
// app.use(`${API_PREFIX}/task-comments`, taskCommentsRouter);
// app.use(`${API_PREFIX}/task-dependencies`, taskDependenciesRouter);
// app.use(`${API_PREFIX}/files`, filesRouter);
// app.use(`${API_PREFIX}/project-files`, projectFilesRouter);
// app.use(`${API_PREFIX}/notifications`, notificationsRouter);
// app.use(`${API_PREFIX}/activity-logs`, activityLogsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected successfully.");
    console.log("Schema synchronized to database.");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(
        `API routes available under ${API_PREFIX} for all 15 feature modules.`
      );
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

startServer();
