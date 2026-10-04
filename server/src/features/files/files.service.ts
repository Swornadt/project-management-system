import crypto from "crypto";
import { IsNull } from "typeorm";
import { File } from "../../entities/file.entity";
import { ProjectFile } from "../../entities/project-file.entity";
import { TaskFile } from "../../entities/task-file.entity";
import { ContentFile } from "../../entities/content-file.entity";
import { Project } from "../../entities/project.entity";
import { ProjectMember } from "../../entities/project-member.entity";
import { Task } from "../../entities/task.entity";
import { Content } from "../../entities/content.entity";
import { User } from "../../entities/user.entity";
import { BaseCRUDService } from "../../shared/services/base.service";
import { getRepo } from "../../shared/db/repositories";
import { HttpError } from "../../shared/middleware/error.middleware";
import type { FileResponse } from "./files.dto";
import { validateAttachment, validateAvatar } from "./files.validation";
import * as storage from "./file.storage";

export class FilesService extends BaseCRUDService<File> {
  constructor() {
    super(File, "file_id");
  }

  private async assertProjectAccess(userId: string, projectId: string): Promise<void> {
    const project = await getRepo(Project).findOne({ where: { project_id: projectId } });
    if (!project) throw new HttpError(404, "Project not found");

    if (project.owner_id === userId) return;

    const membership = await getRepo(ProjectMember).findOne({
      where: { project_id: projectId, user_id: userId },
    });
    if (!membership) {
      throw new HttpError(403, "You do not have access to this project");
    }
  }

  private async assertTaskAccess(userId: string, taskId: string): Promise<Task> {
    const task = await getRepo(Task).findOne({ where: { task_id: taskId } });
    if (!task) throw new HttpError(404, "Task not found");
    await this.assertProjectAccess(userId, task.project_id);
    return task;
  }

  private async assertContentAccess(userId: string, contentId: string): Promise<Content> {
    const content = await getRepo(Content).findOne({ where: { content_id: contentId } });
    if (!content) throw new HttpError(404, "Content not found");
    await this.assertProjectAccess(userId, content.project_id);
    return content;
  }


  //user must have access to at least one of the projects this file is attached to.
   
  async assertCanViewFile(userId: string, fileId: string): Promise<void> {
    const projectLinks = await getRepo(ProjectFile).find({ where: { file_id: fileId } });
    const taskLinks = await getRepo(TaskFile).find({ where: { file_id: fileId } });
    const contentLinks = await getRepo(ContentFile).find({ where: { file_id: fileId } });

    const projectIds = new Set<string>();
    for (const pl of projectLinks) projectIds.add(pl.project_id);

    for (const tl of taskLinks) {
      const task = await getRepo(Task).findOne({ where: { task_id: tl.task_id } });
      if (task) projectIds.add(task.project_id);
    }
    for (const cl of contentLinks) {
      const content = await getRepo(Content).findOne({ where: { content_id: cl.content_id } });
      if (content) projectIds.add(content.project_id);
    }

    if (projectIds.size === 0) {
      const file = await this.repo().findOne({ where: { file_id: fileId } });
      if (!file || file.uploaded_by !== userId) {
        throw new HttpError(403, "You do not have access to this file");
      }
      return;
    }
    for (const pid of projectIds) {
      try {
        await this.assertProjectAccess(userId, pid);
        return; 
      } catch {
      }
    }
    throw new HttpError(403, "You do not have access to this file");
  }
  async upload(
    userId: string,
    upload: { buffer: Buffer; originalname: string },
    parent: { project_id?: string; task_id?: string; content_id?: string }
  ): Promise<File> {
    const targets = [parent.project_id, parent.task_id, parent.content_id].filter(Boolean);
    if (targets.length !== 1) {
      throw new HttpError(400, "Provide exactly one of project_id, task_id, content_id");
    }
    if (parent.project_id) await this.assertProjectAccess(userId, parent.project_id);
    if (parent.task_id) await this.assertTaskAccess(userId, parent.task_id);
    if (parent.content_id) await this.assertContentAccess(userId, parent.content_id);

    const validated = await validateAttachment(upload.buffer, upload.originalname);
    const key = storage.buildStorageKey(userId, validated.extension, "attachments");
    await storage.saveFile(key, upload.buffer);

    const checksum = crypto.createHash("sha256").update(upload.buffer).digest("hex");
    const saved = await this.repo().save(
      this.repo().create({
        original_name: upload.originalname,
        storage_key: key,
        mime_type: validated.mimeType,
        size_bytes: validated.sizeBytes,
        checksum,
        uploaded_by: userId,
      })
    );

    if (parent.project_id) await this.attachToProject(saved.file_id, parent.project_id);
    if (parent.task_id) await this.attachToTask(saved.file_id, parent.task_id);
    if (parent.content_id) await this.attachToContent(saved.file_id, parent.content_id);

    return saved;
  }
  async attachToProject(fileId: string, projectId: string): Promise<ProjectFile> {
    const file = await this.repo().findOne({ where: { file_id: fileId, deleted_at: IsNull() } });
    if (!file) throw new HttpError(404, "File not found");

    const repo = getRepo(ProjectFile);
    const existing = await repo.findOne({ where: { project_id: projectId, file_id: fileId } });
    if (existing) throw new HttpError(409, "File already attached to this project");

    return repo.save(repo.create({ project_id: projectId, file_id: fileId }));
  }

  async listForProject(userId: string, projectId: string): Promise<File[]> {
    await this.assertProjectAccess(userId, projectId);
    const links = await getRepo(ProjectFile).find({
      where: { project_id: projectId },
      relations: { file: true },
      order: { created_at: "DESC" },
    });
    return links.map((l) => l.file).filter((f): f is File => !!f && !f.deleted_at);
  }
  async attachToTask(fileId: string, taskId: string): Promise<TaskFile> {
    const file = await this.repo().findOne({ where: { file_id: fileId, deleted_at: IsNull() } });
    if (!file) throw new HttpError(404, "File not found");

    const repo = getRepo(TaskFile);
    const existing = await repo.findOne({ where: { task_id: taskId, file_id: fileId } });
    if (existing) throw new HttpError(409, "File already attached to this task");

    return repo.save(repo.create({ task_id: taskId, file_id: fileId }));
  }

  async listForTask(userId: string, taskId: string): Promise<File[]> {
    await this.assertTaskAccess(userId, taskId);
    const links = await getRepo(TaskFile).find({
      where: { task_id: taskId },
      relations: { file: true },
      order: { created_at: "DESC" },
    });
    return links.map((l) => l.file).filter((f): f is File => !!f && !f.deleted_at);
  }
  async attachToContent(fileId: string, contentId: string): Promise<ContentFile> {
    const file = await this.repo().findOne({ where: { file_id: fileId, deleted_at: IsNull() } });
    if (!file) throw new HttpError(404, "File not found");

    const repo = getRepo(ContentFile);
    const existing = await repo.findOne({ where: { content_id: contentId, file_id: fileId } });
    if (existing) throw new HttpError(409, "File already attached to this content");

    return repo.save(repo.create({ content_id: contentId, file_id: fileId }));
  }

  async listForContent(userId: string, contentId: string): Promise<File[]> {
    await this.assertContentAccess(userId, contentId);
    const links = await getRepo(ContentFile).find({
      where: { content_id: contentId },
      relations: { file: true },
      order: { created_at: "DESC" },
    });
    return links.map((l) => l.file).filter((f): f is File => !!f && !f.deleted_at);
  }
  async softDelete(fileId: string, userId: string): Promise<boolean> {
    const file = await this.repo().findOne({ where: { file_id: fileId } });
    if (!file) throw new HttpError(404, "File not found");
    if (file.uploaded_by !== userId) throw new HttpError(403, "Not your file");
    if (file.deleted_at) return true;

    file.deleted_at = new Date();
    await this.repo().save(file);

    await Promise.all([
      getRepo(ProjectFile).delete({ file_id: fileId }),
      getRepo(TaskFile).delete({ file_id: fileId }),
      getRepo(ContentFile).delete({ file_id: fileId }),
    ]);

    return true;
  }
  async setAvatar(
    userId: string,
    upload: { buffer: Buffer; originalname: string }
  ): Promise<File> {
    const user = await getRepo(User).findOne({ where: { user_id: userId } });
    if (!user) throw new HttpError(404, "User not found");

    const validated = await validateAvatar(upload.buffer, upload.originalname);
    const previousAvatarId = user.avatar_file_id;

    const key = storage.buildStorageKey(userId, validated.extension, "avatars");
    await storage.saveFile(key, upload.buffer);
    const checksum = crypto.createHash("sha256").update(upload.buffer).digest("hex");

    const newFile = await this.repo().save(
      this.repo().create({
        original_name: upload.originalname,
        storage_key: key,
        mime_type: validated.mimeType,
        size_bytes: validated.sizeBytes,
        checksum,
        uploaded_by: userId,
      })
    );

    user.avatar_file_id = newFile.file_id;
    await getRepo(User).save(user);

    if (previousAvatarId && previousAvatarId !== newFile.file_id) {
      const prev = await this.repo().findOne({ where: { file_id: previousAvatarId } });
      if (prev) {
        await storage.removeFile(prev.storage_key);
        await this.repo().remove(prev);
      }
    }

    return newFile;
  }

  toResponse(file: File): FileResponse {
    return {
      file_id: file.file_id,
      original_name: file.original_name,
      mime_type: file.mime_type,
      size_bytes: Number(file.size_bytes),
      uploaded_by: file.uploaded_by,
      created_at: file.created_at,
      url: storage.fileUrl(file.file_id),
    };
  }
}

export const filesService = new FilesService();