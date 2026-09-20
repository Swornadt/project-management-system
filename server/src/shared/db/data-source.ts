import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

import { Role } from "../../entities/role.entity";
import { User } from "../../entities/user.entity";
import { RefreshToken } from "../../entities/refresh-token.entity";
import { Project } from "../../entities/project.entity";
import { ProjectMember } from "../../entities/project-member.entity";
import { Content } from "../../entities/content.entity";
import { Tag } from "../../entities/tag.entity";
import { ContentTag } from "../../entities/content-tag.entity";
import { Task } from "../../entities/task.entity";
import { TaskComment } from "../../entities/task-comment.entity";
import { TaskDependency } from "../../entities/task-dependency.entity";
import { File } from "../../entities/file.entity";
import { ProjectFile } from "../../entities/project-file.entity";
import { Notification } from "../../entities/notification.entity";
import { ActivityLog } from "../../entities/activity-log.entity";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  entities: [
    Role,
    User,
    RefreshToken,
    Project,
    ProjectMember,
    Content,
    Tag,
    ContentTag,
    Task,
    TaskComment,
    TaskDependency,
    File,
    ProjectFile,
    Notification,
    ActivityLog,
  ],
  synchronize: true,
  logging: true,
});
