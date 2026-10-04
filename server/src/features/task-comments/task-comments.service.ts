import { BaseCRUDService } from "../../shared/services/base.service";
import { getRepo } from "../../shared/db/repositories";
import { TaskComment } from "../../entities/task-comment.entity";
import { Task } from "../../entities/task.entity";
import { Notification } from "../../entities/notification.entity";
import { ActivityLog } from "../../entities/activity-log.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import type { CreateTaskCommentDto, UpdateTaskCommentDto } from "./task-comments.dto";

export class TaskCommentService extends BaseCRUDService<
  TaskComment,
  CreateTaskCommentDto,
  UpdateTaskCommentDto
> {
  constructor() {
    super(TaskComment, "comment_id");
  }

  async findAllForTask(taskId: string): Promise<TaskComment[]> {
    return this.repo().find({
      where: { task_id: taskId } as any,
      order: { created_at: "ASC" } as any,
    });
  }

  override async create(payload: CreateTaskCommentDto): Promise<TaskComment> {
    const taskRepo = getRepo(Task);
    const task = await taskRepo.findOne({ where: { task_id: payload.task_id } as any });
    if (!task) throw new HttpError(404, "Task not found");

    const comment = await super.create(payload);

    const activityRepo = getRepo(ActivityLog);
    await activityRepo.save(
      activityRepo.create({
        user_id: payload.user_id,
        project_id: task.project_id,
        action: "task.commented",
        entity_type: "task",
        entity_id: task.task_id,
        description: `Comment added on "${task.title}"`,
      })
    );

    const notificationRepo = getRepo(Notification);
    const recipients = new Set(
      [task.assignee_id, task.created_by].filter(
        (userId): userId is string => !!userId && userId !== payload.user_id
      )
    );
    for (const recipientId of recipients) {
      await notificationRepo.save(
        notificationRepo.create({
          user_id: recipientId,
          type: "task_comment",
          title: "New comment on your task",
          message: `New comment on "${task.title}".`,
        })
      );
    }

    return comment;
  }

  async removeIfOwnerOrPrivileged(
    id: string,
    actingUserId: string,
    isPrivileged: boolean
  ): Promise<boolean> {
    const comment = await this.findOne(id);
    if (!comment) return false;
    if (!isPrivileged && comment.user_id !== actingUserId) {
      throw new HttpError(403, "You can only delete your own comments");
    }
    return this.remove(id);
  }
}

export const taskCommentService = new TaskCommentService();
