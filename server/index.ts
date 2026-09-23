import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { instanceToPlain } from "class-transformer";
import { AppDataSource } from "./src/shared/db/data-source";
import { errorHandler, notFoundHandler } from "./src/shared/middleware/error.middleware";

import { authRouter } from "./src/features/authentication/auth.routes";
import { usersRouter } from "./src/features/users/users.routes";
import { projectRouter } from "./src/features/projects/project.routes";

dotenv.config();

const app = express();
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
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/projects`, projectRouter);

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