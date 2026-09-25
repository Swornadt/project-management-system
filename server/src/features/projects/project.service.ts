import { AppDataSource } from "../../shared/db/data-source";
import { HttpError } from "../../shared/middleware/error.middleware";
import { Project } from "../../entities/project.entity";
import { ProjectMember } from "../../entities/project-member.entity";
import { User } from "../../entities/user.entity";
import { Task } from "../../entities/task.entity";
import { File } from "../../entities/file.entity";
import { ProjectFile } from "../../entities/project-file.entity";
import { ActivityLog } from "../../entities/activity-log.entity";
import { Notification } from "../../entities/notification.entity";
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectQueryDto,
  AddProjectMemberDto,
} from "./project.dto";

const VALID_STATUSES = [
  "Planned",
  "Active",
  "On Hold",
  "Completed",
  "Archived",
] as const;

const VALID_PRIORITIES = [
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;

const TASK_STATUS = {
  BACKLOG: "backlog",
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  BLOCKED: "blocked",
  DONE: "done",
  CANCELLED: "cancelled",
} as const;

const ALLOWED_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "name",
  "key_code",
  "status",
  "priority",
  "start_date",
  "due_date",
] as const;

class ProjectService {
  private get projectRepository() {
    return AppDataSource.getRepository(Project);
  }
  private get projectMemberRepository() {
    return AppDataSource.getRepository(ProjectMember);
  }
  private get userRepository() {
    return AppDataSource.getRepository(User);
  }
  private get taskRepository() {
    return AppDataSource.getRepository(Task);
  }
  private get fileRepository() {
    return AppDataSource.getRepository(File);
  }
  private get projectFileRepository() {
    return AppDataSource.getRepository(ProjectFile);
  }
  private get activityLogRepository() {
    return AppDataSource.getRepository(ActivityLog);
  }
  private get notificationRepository() {
    return AppDataSource.getRepository(Notification);
  }

  private isAdmin(role: string) {
    return role.toLowerCase() === "admin";
  }

  private isManager(role: string) {
    return role.toLowerCase() === "manager";
  }

  private validateStatus(status?: string) {
    if (status && !VALID_STATUSES.includes(status as any)) {
      throw new HttpError(
        400,
        `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`
      );
    }
  }

  private validatePriority(priority?: string) {
    if (priority && !VALID_PRIORITIES.includes(priority as any)) {
      throw new HttpError(
        400,
        `Invalid priority. Allowed: ${VALID_PRIORITIES.join(", ")}`
      );
    }
  }

  private toDateString(d: Date | string | undefined): string | undefined {
    if (!d) return undefined;
    const date = d instanceof Date ? d : new Date(d);
    return isNaN(date.getTime())
      ? undefined
      : date.toISOString().split("T")[0];
  }

  private async hasProjectAccess(
    projectId: string,
    userId: string,
    role: string
  ) {
    if (this.isAdmin(role)) return true;

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });
    if (!project) return false;
    if (project.owner_id === userId) return true;

    const membership = await this.projectMemberRepository.findOne({
      where: { project_id: projectId, user_id: userId },
    });
    return !!membership;
  }

  private async canManageProject(
    projectId: string,
    userId: string,
    role: string
  ) {
    if (this.isAdmin(role)) return true;

    if (this.isManager(role)) {
      const project = await this.projectRepository.findOne({
        where: { project_id: projectId },
      });
      if (!project) return false;
      return project.owner_id === userId;
    }
    return false;
  }

  private async logActivity(
    projectId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    description: string
  ) {
    try {
      const log = this.activityLogRepository.create({
        project_id: projectId,
        user_id: userId,
        action,
        entity_type: entityType,
        description,
        ...(entityId ? { entity_id: entityId } : {}),
      });
      await this.activityLogRepository.save(log);
    } catch {}
  }

  async createProject(
    data: CreateProjectDto,
    userId: string,
    role: string
  ) {
    if (!this.isAdmin(role) && !this.isManager(role)) {
      throw new HttpError(
        403,
        "You do not have permission to create projects"
      );
    }

    this.validateStatus(data.status);
    this.validatePriority(data.priority);

    const ownerId = data.owner_id ?? userId;

    const owner = await this.userRepository.findOne({
      where: { user_id: ownerId },
    });
    if (!owner) throw new HttpError(404, "Project owner not found");

    const existing = await this.projectRepository.findOne({
      where: { key_code: data.key_code },
    });
    if (existing) {
      throw new HttpError(409, "Project key/code already exists");
    }

    if (
      data.start_date &&
      data.due_date &&
      data.due_date < data.start_date
    ) {
      throw new HttpError(
        400,
        "Due date cannot be before start date"
      );
    }

    const project = this.projectRepository.create({
      name: data.name,
      key_code: data.key_code,
      description: data.description ?? null,
      owner_id: ownerId,
      status: data.status ?? "Planned",
      priority: data.priority ?? "Medium",
      start_date: data.start_date ?? null,
      due_date: data.due_date ?? null,
    });

    const savedProject = await this.projectRepository.save(project);

    const ownerMember = this.projectMemberRepository.create({
      project_id: savedProject.project_id,
      user_id: ownerId,
      role: "manager",
    });
    await this.projectMemberRepository.save(ownerMember);

    await this.logActivity(
      savedProject.project_id,
      userId,
      "created",
      "project",
      savedProject.project_id,
      `Project "${savedProject.name}" was created`
    );

    return savedProject;
  }

  async getProjects(
    query: ProjectQueryDto,
    userId: string,
    role: string
  ) {
    const {
      page = 1,
      per_page = 25,
      q,
      status,
      owner_id,
      member_id,
      priority,
      start_from,
      start_to,
      end_from,
      end_to,
      include_archived,
      sort,
    } = query;

    const qb = this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.owner", "owner");

    if (!this.isAdmin(role)) {
      qb.innerJoin(
        ProjectMember,
        "membership",
        "membership.project_id = project.project_id"
      ).andWhere(
        "(project.owner_id = :userId OR membership.user_id = :userId)",
        { userId }
      );
    }

    if (q) {
      qb.andWhere(
        "(LOWER(project.name) LIKE LOWER(:q) OR " +
          "LOWER(project.key_code) LIKE LOWER(:q) OR " +
          "LOWER(project.description) LIKE LOWER(:q))",
        { q: `%${q}%` }
      );
    }
    if (status) {
      qb.andWhere("project.status = :status", { status });
    }
    if (owner_id) {
      qb.andWhere("project.owner_id = :ownerId", {
        ownerId: owner_id,
      });
    }
    if (member_id) {
      qb.innerJoin(
        ProjectMember,
        "filterMember",
        "filterMember.project_id = project.project_id"
      ).andWhere("filterMember.user_id = :memberId", {
        memberId: member_id,
      });
    }
    if (priority) {
      qb.andWhere("project.priority = :priority", { priority });
    }
    if (start_from) {
      qb.andWhere("project.start_date >= :startFrom", {
        startFrom: this.toDateString(start_from),
      });
    }
    if (start_to) {
      qb.andWhere("project.start_date <= :startTo", {
        startTo: this.toDateString(start_to),
      });
    }
    if (end_from) {
      qb.andWhere("project.due_date >= :endFrom", {
        endFrom: this.toDateString(end_from),
      });
    }
    if (end_to) {
      qb.andWhere("project.due_date <= :endTo", {
        endTo: this.toDateString(end_to),
      });
    }
    if (include_archived !== "true") {
      qb.andWhere("project.status != :archived", {
        archived: "Archived",
      });
    }

    const rawSort = sort ?? "-created_at";
    const sortDir = rawSort.startsWith("-") ? "DESC" : "ASC";
    const sortField = rawSort.startsWith("-")
      ? rawSort.slice(1)
      : rawSort;

    if (
      (ALLOWED_SORT_FIELDS as readonly string[]).includes(sortField)
    ) {
      qb.orderBy(`project.${sortField}`, sortDir as "ASC" | "DESC");
    } else {
      qb.orderBy("project.created_at", "DESC");
    }

    const skip = (page - 1) * per_page;
    qb.skip(skip).take(per_page);

    const [projects, total] = await qb.getManyAndCount();

    return {
      projects,
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    };
  }

  async getProject(
    projectId: string,
    userId: string,
    role: string
  ) {
    const hasAccess = await this.hasProjectAccess(
      projectId,
      userId,
      role
    );
    if (!hasAccess) {
      throw new HttpError(
        403,
        "You do not have access to this project"
      );
    }

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
      relations: { owner: true, members: true },
    });
    if (!project) throw new HttpError(404, "Project not found");

    return project;
  }

  async updateProject(
    projectId: string,
    data: UpdateProjectDto,
    userId: string,
    role: string
  ) {
    const canManage = await this.canManageProject(
      projectId,
      userId,
      role
    );
    if (!canManage) {
      throw new HttpError(
        403,
        "You do not have permission to update this project"
      );
    }

    this.validateStatus(data.status);
    this.validatePriority(data.priority);

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });
    if (!project) throw new HttpError(404, "Project not found");

    if (project.status === "Archived") {
      throw new HttpError(
        400,
        "Archived projects cannot be modified"
      );
    }

    if (data.key_code && data.key_code !== project.key_code) {
      const existing = await this.projectRepository.findOne({
        where: { key_code: data.key_code },
      });
      if (existing) {
        throw new HttpError(409, "Project key/code already exists");
      }
    }

    const startDate = data.start_date ?? project.start_date;
    const dueDate = data.due_date ?? project.due_date;

    if (startDate && dueDate && dueDate < startDate) {
      throw new HttpError(
        400,
        "Due date cannot be before start date"
      );
    }

    Object.assign(project, data);
    const saved = await this.projectRepository.save(project);

    await this.logActivity(
      projectId,
      userId,
      "updated",
      "project",
      projectId,
      `Project "${saved.name}" was updated`
    );

    return saved;
  }

  async archiveProject(
    projectId: string,
    userId: string,
    role: string
  ) {
    const canManage = await this.canManageProject(
      projectId,
      userId,
      role
    );
    if (!canManage) {
      throw new HttpError(
        403,
        "You do not have permission to archive this project"
      );
    }

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });
    if (!project) throw new HttpError(404, "Project not found");

    project.status = "Archived";
    if ("archived_at" in project) {
      (project as any).archived_at = new Date();
    }

    await this.projectRepository.save(project);

    await this.logActivity(
      projectId,
      userId,
      "archived",
      "project",
      projectId,
      `Project "${project.name}" was archived`
    );

    return {
      message: "Project archived successfully",
      project_id: project.project_id,
      status: project.status,
    };
  }

  async addProjectMember(
    projectId: string,
    data: AddProjectMemberDto,
    userId: string,
    role: string
  ) {
    const canManage = await this.canManageProject(
      projectId,
      userId,
      role
    );
    if (!canManage) {
      throw new HttpError(
        403,
        "You do not have permission to manage project members"
      );
    }

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });
    if (!project) throw new HttpError(404, "Project not found");

    const member = await this.userRepository.findOne({
      where: { user_id: data.user_id },
    });
    if (!member) throw new HttpError(404, "User not found");

    const existing = await this.projectMemberRepository.findOne({
      where: {
        project_id: projectId,
        user_id: data.user_id,
      },
    });
    if (existing) {
      throw new HttpError(409, "User is already a project member");
    }

    const projectMember = this.projectMemberRepository.create({
      project_id: projectId,
      user_id: data.user_id,
      role: data.role ?? "member",
    });
    const saved = await this.projectMemberRepository.save(
      projectMember
    );

    await this.logActivity(
      projectId,
      userId,
      "member_added",
      "project_member",
      data.user_id,
      `User ${data.user_id} was added as ${
        data.role ?? "member"
      }`
    );

    return saved;
  }

  async removeProjectMember(
    projectId: string,
    memberUserId: string,
    userId: string,
    role: string
  ) {
    const canManage = await this.canManageProject(
      projectId,
      userId,
      role
    );
    if (!canManage) {
      throw new HttpError(
        403,
        "You do not have permission to manage project members"
      );
    }

    const member = await this.projectMemberRepository.findOne({
      where: {
        project_id: projectId,
        user_id: memberUserId,
      },
    });
    if (!member) throw new HttpError(404, "Project member not found");

    await this.projectMemberRepository.remove(member);

    await this.logActivity(
      projectId,
      userId,
      "member_removed",
      "project_member",
      memberUserId,
      `User ${memberUserId} was removed from the project`
    );

    return { message: "Project member removed successfully" };
  }

  async getProjectDashboard(
    projectId: string,
    userId: string,
    role: string
  ) {
    const hasAccess = await this.hasProjectAccess(
      projectId,
      userId,
      role
    );
    if (!hasAccess) {
      throw new HttpError(
        403,
        "You do not have access to this project"
      );
    }

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
      relations: { owner: true, members: true },
    });
    if (!project) throw new HttpError(404, "Project not found");

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const soonStr = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];

    const [
      totalTasks,
      doneTasks,
      inProgressTasks,
      todoTasks,
      backlogTasks,
      inReviewTasks,
      blockedTasks,
      cancelledTasks,
    ] = await Promise.all([
      this.taskRepository.count({
        where: { project_id: projectId },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: TASK_STATUS.DONE,
        },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: TASK_STATUS.IN_PROGRESS,
        },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: TASK_STATUS.TODO,
        },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: TASK_STATUS.BACKLOG,
        },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: TASK_STATUS.IN_REVIEW,
        },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: TASK_STATUS.BLOCKED,
        },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: TASK_STATUS.CANCELLED,
        },
      }),
    ]);

    const progress =
      totalTasks === 0
        ? 0
        : Math.round((doneTasks / totalTasks) * 100);

    const overdueTasks = await this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.assignee", "assignee")
      .where("task.project_id = :projectId", { projectId })
      .andWhere("task.due_date < :today", { today: todayStr })
      .andWhere("task.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: [TASK_STATUS.DONE, TASK_STATUS.CANCELLED],
      })
      .orderBy("task.due_date", "ASC")
      .take(10)
      .getMany();

    const upcomingDeadlines = await this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.assignee", "assignee")
      .where("task.project_id = :projectId", { projectId })
      .andWhere("task.due_date BETWEEN :today AND :soon", {
        today: todayStr,
        soon: soonStr,
      })
      .andWhere("task.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: [TASK_STATUS.DONE, TASK_STATUS.CANCELLED],
      })
      .orderBy("task.due_date", "ASC")
      .take(10)
      .getMany();

    const projectFiles = await this.projectFileRepository.find({
      where: { project_id: projectId },
      relations: { file: true },
      order: { created_at: "DESC" },
      take: 10,
    });

    const files = projectFiles.map((pf) => ({
      file_id: pf.file.file_id,
      original_name: pf.file.original_name,
      mime_type: pf.file.mime_type,
      size_bytes: pf.file.size_bytes,
      checksum: pf.file.checksum,
      uploaded_by: pf.file.uploaded_by,
      file_created_at: pf.file.created_at,
      added_to_project_at: pf.created_at,
    }));

    const recentActivity = await this.activityLogRepository.find({
      where: { project_id: projectId },
      relations: { user: true },
      order: { created_at: "DESC" },
      take: 10,
    });

    const notifications = await this.notificationRepository.find({
      where: { user_id: userId },
      order: { is_read: "ASC", created_at: "DESC" },
      take: 10,
    });

    return {
      project,
      progress,
      task_counts: {
        total: totalTasks,
        completed: doneTasks,
        in_progress: inProgressTasks,
        todo: todoTasks,
        backlog: backlogTasks,
        in_review: inReviewTasks,
        blocked: blockedTasks,
        cancelled: cancelledTasks,
      },
      overdue_tasks: overdueTasks,
      upcoming_deadlines: upcomingDeadlines,
      files,
      recent_activity: recentActivity,
      notifications,
    };
  }
}

export const projectService = new ProjectService();