import { BaseCRUDService } from "../../shared/services/base.service";
import { getRepo } from "../../shared/db/repositories";
import { Task } from "../../entities/task.entity";
import { Notification } from "../../entities/notification.entity";
import { ActivityLog } from "../../entities/activity-log.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import type {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilterDto,
} from "./tasks.dto";
import type { PaginatedResponse, PaginationParams, SortParams } from "../../shared/types";

// Statuses per SRS §5.5. Backlog/Todo are both "not started" buckets that
// teams use differently, so both are valid entry points.
export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// Allowed status transitions per SRS §11.2 ("Status transitions should be
// validated by backend rules"). Keyed by current status -> set of statuses
// it may move to next.
const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ["todo", "in_progress", "cancelled"],
  todo: ["in_progress", "backlog", "cancelled"],
  in_progress: ["in_review", "blocked", "todo", "cancelled"],
  in_review: ["done", "in_progress", "blocked"],
  blocked: ["in_progress", "cancelled"],
  done: ["in_progress"], // reopening a task is allowed
  cancelled: [],
};

export class TaskService extends BaseCRUDService<Task, CreateTaskDto, UpdateTaskDto> {
  constructor() {
    super(Task, "task_id");
  }

  async findAllForProject(
    projectId: string,
    filters: TaskFilterDto = {},
    pagination: PaginationParams = {},
    sort: SortParams = {}
  ): Promise<PaginatedResponse<Task>> {
    const qb = this.repo()
      .createQueryBuilder("task")
      .where("task.project_id = :projectId", { projectId });

    if (filters.status) {
      qb.andWhere("task.status = :status", { status: filters.status });
    }
    if (filters.priority) {
      qb.andWhere("task.priority = :priority", { priority: filters.priority });
    }
    if (filters.assignee_id) {
      qb.andWhere("task.assignee_id = :assigneeId", { assigneeId: filters.assignee_id });
    }
    if (filters.label) {
      qb.andWhere(":label = ANY(task.labels)", { label: filters.label });
    }
    if (filters.overdue) {
      qb.andWhere("task.due_date < CURRENT_DATE").andWhere(
        "task.status NOT IN ('done', 'cancelled')"
      );
    }

    const limit = Math.min(Math.max(pagination.limit ?? 20, 1), 100);
    const offset = Math.max(pagination.offset ?? 0, 0);
    const sortBy = sort.sortBy ?? "created_at";
    const sortOrder = (sort.sortOrder ?? "desc").toUpperCase() as "ASC" | "DESC";

    qb.orderBy(`task.${sortBy}`, sortOrder).skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, limit, offset, count: items.length };
  }

  override async create(payload: CreateTaskDto): Promise<Task> {
    if (payload.status && !TASK_STATUSES.includes(payload.status as TaskStatus)) {
      throw new HttpError(400, `Invalid status '${payload.status}'`);
    }
    if (payload.priority && !TASK_PRIORITIES.includes(payload.priority as TaskPriority)) {
      throw new HttpError(400, `Invalid priority '${payload.priority}'`);
    }
    if (payload.parent_task_id) {
      const parent = await this.findOne(payload.parent_task_id);
      if (!parent) throw new HttpError(400, "Parent task does not exist");
      if (parent.project_id !== payload.project_id) {
        throw new HttpError(400, "Parent task must belong to the same project");
      }
    }

    const task = await super.create(payload);

    if (task.assignee_id) {
      await this.notifyAssignment(task, task.assignee_id);
    }
    await this.logActivity(task.created_by, task.project_id, "task.created", task.task_id, {
      title: task.title,
    });

    return task;
  }

  async updateStatus(
    id: string,
    newStatus: string,
    actingUserId: string,
    actingUserRole?: string
  ): Promise<Task> {
    if (!TASK_STATUSES.includes(newStatus as TaskStatus)) {
      throw new HttpError(400, `Invalid status '${newStatus}'`);
    }
    const task = await this.findOne(id);
    if (!task) throw new HttpError(404, "Task not found");

    // Admin/Manager can update any task; an Employee may only update the
    // status of a task assigned to them (SRS §5.2 role permission model).
    const isPrivileged = actingUserRole === "Admin" || actingUserRole === "Manager";
    if (!isPrivileged && task.assignee_id !== actingUserId) {
      throw new HttpError(403, "You can only update the status of tasks assigned to you");
    }

    const current = task.status as TaskStatus;
    const allowedNext = STATUS_TRANSITIONS[current] ?? [];
    if (current !== newStatus && !allowedNext.includes(newStatus as TaskStatus)) {
      throw new HttpError(
        409,
        `Cannot move task from '${current}' to '${newStatus}'`
      );
    }

    const merged = this.repo().merge(task, { status: newStatus });
    const saved = await this.repo().save(merged);

    await this.logActivity(actingUserId, task.project_id, "task.status_changed", task.task_id, {
      from: current,
      to: newStatus,
    });

    if (task.created_by && task.created_by !== actingUserId) {
      await this.notify(
        task.created_by,
        "task_status_changed",
        `Task status updated`,
        `"${task.title}" moved from ${current} to ${newStatus}.`
      );
    }

    return saved;
  }

  async assign(id: string, assigneeId: string | null, actingUserId: string): Promise<Task> {
    const task = await this.findOne(id);
    if (!task) throw new HttpError(404, "Task not found");

    // Use a raw update (rather than merge) so an explicit `null` clears the
    // column instead of merge treating `undefined` as "leave unchanged".
    await this.repo().update({ task_id: id } as any, { assignee_id: assigneeId } as any);
    const saved = await this.findOne(id);
    if (!saved) throw new HttpError(404, "Task not found");

    await this.logActivity(actingUserId, task.project_id, "task.assigned", task.task_id, {
      assignee_id: assigneeId,
    });

    if (assigneeId) {
      await this.notifyAssignment(saved, assigneeId);
    }

    return saved;
  }

  async listSubtasks(parentTaskId: string): Promise<Task[]> {
    return this.repo().find({ where: { parent_task_id: parentTaskId } as any });
  }

  private async notifyAssignment(task: Task, assigneeId: string): Promise<void> {
    await this.notify(
      assigneeId,
      "task_assigned",
      "You were assigned a task",
      `You were assigned to "${task.title}".`
    );
  }

  private async notify(
    userId: string,
    type: string,
    title: string,
    message: string
  ): Promise<void> {
    const notificationRepo = getRepo(Notification);
    const notification = notificationRepo.create({
      user_id: userId,
      type,
      title,
      message,
    });
    await notificationRepo.save(notification);
  }

  private async logActivity(
    userId: string,
    projectId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const activityRepo = getRepo(ActivityLog);
    const entry = activityRepo.create({
      user_id: userId,
      project_id: projectId,
      action,
      entity_type: "task",
      entity_id: entityId,
      description: JSON.stringify(metadata),
    });
    await activityRepo.save(entry);
  }
}

export const taskService = new TaskService();
