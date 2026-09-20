import { AppDataSource } from "../../shared/db/data-source";

import { Project } from "../../entities/project.entity";
import { User } from "../../entities/user.entity";
import { ProjectMember } from "../../entities/project-member.entity";
import { Task } from "../../entities/task.entity";
import { ProjectFile } from "../../entities/project-file.entity";
import { ActivityLog } from "../../entities/activity-log.entity";

import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectQueryDto,
  AddProjectMemberDto,
} from "./project.dto";

export class ProjectService {
  private projectRepository =
    AppDataSource.getRepository(Project);

  private userRepository =
    AppDataSource.getRepository(User);

  private memberRepository =
    AppDataSource.getRepository(ProjectMember);

  private taskRepository =
    AppDataSource.getRepository(Task);

  private projectFileRepository =
    AppDataSource.getRepository(ProjectFile);

  private activityRepository =
    AppDataSource.getRepository(ActivityLog);

  private async assertProjectAccess(
    projectId: string,
    userId: string,
    role: string
  ) {
    if (role === "admin") return;

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.owner_id === userId) return;

    const member = await this.memberRepository.findOne({
      where: {
        project_id: projectId,
        user_id: userId,
      },
    });

    if (!member) {
      throw new Error("You do not have access to this project");
    }
  }

  private async assertProjectManage(
    projectId: string,
    userId: string,
    role: string
  ) {
    if (role === "admin") return;

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.owner_id === userId) return;

    const member = await this.memberRepository.findOne({
      where: {
        project_id: projectId,
        user_id: userId,
      },
    });

    if (!member || member.role !== "manager") {
      throw new Error(
        "You are not allowed to manage this project"
      );
    }
  }

  async createProject(
    data: CreateProjectDto,
    currentUserId: string,
    currentUserRole: string
  ) {
    const role = currentUserRole.trim().toLowerCase();

    if (role !== "admin" && role !== "manager") {
      throw new Error("You are not allowed to create projects");
    }

    let ownerId: string;

    if (role === "admin") {
      if (!data.owner_id) {
        throw new Error("Admin must assign a project manager");
      }

      ownerId = data.owner_id;
    } else {
      ownerId = currentUserId;
    }

    const owner = await this.userRepository.findOne({
      where: { user_id: ownerId },
      relations: { role: true },
    });

    if (!owner) {
      throw new Error("Project owner not found");
    }

    if (owner.role.name.toLowerCase() !== "manager") {
      throw new Error("Project owner must have the Manager role");
    }

    const existingProject =
      await this.projectRepository.findOne({
        where: { key: data.key },
      });

    if (existingProject) {
      throw new Error("Project key already exists");
    }

    const savedProject = await AppDataSource.transaction(
      async (manager) => {
        const projectRepo = manager.getRepository(Project);
        const memberRepo =
          manager.getRepository(ProjectMember);
        const userRepo = manager.getRepository(User);
        const activityRepo =
          manager.getRepository(ActivityLog);

        const project = projectRepo.create({
          name: data.name,
          key: data.key,
          description: data.description,
          owner_id: ownerId,
          status: data.status ?? "planned",
          priority: data.priority ?? "medium",
          start_date: data.start_date
            ? new Date(data.start_date)
            : undefined,
          due_date: data.due_date
            ? new Date(data.due_date)
            : undefined,
        });

        let created: Project;

        try {
          created = await projectRepo.save(project);
        } catch (err: any) {
          if (err?.code === "23505") {
            throw new Error("Project key already exists");
          }

          throw err;
        }

        await memberRepo.save(
          memberRepo.create({
            project_id: created.project_id,
            user_id: ownerId,
            role: "manager",
          })
        );

        if (
          role === "admin" &&
          currentUserId !== ownerId
        ) {
          await memberRepo.save(
            memberRepo.create({
              project_id: created.project_id,
              user_id: currentUserId,
              role: "admin",
            })
          );
        }

        if (data.member_ids?.length) {
          for (const memberId of data.member_ids) {
            if (memberId === ownerId) continue;
            if (memberId === currentUserId) continue;

            const user = await userRepo.findOne({
              where: { user_id: memberId },
            });

            if (!user) {
              throw new Error(
                `User ${memberId} not found`
              );
            }

            const exists = await memberRepo.findOne({
              where: {
                project_id: created.project_id,
                user_id: memberId,
              },
            });

            if (exists) continue;

            await memberRepo.save(
              memberRepo.create({
                project_id: created.project_id,
                user_id: memberId,
                role: "member",
              })
            );
          }
        }

        await activityRepo.save(
          activityRepo.create({
            project_id: created.project_id,
            user_id: currentUserId,
            action: "created_project",
          })
        );

        return created;
      }
    );

    return savedProject;
  }

  async getProjects(
    query: ProjectQueryDto,
    currentUserId: string,
    currentUserRole: string
  ) {
    const role = currentUserRole.trim().toLowerCase();

    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      owner_id,
      member_id,
      start_date_from,
      start_date_to,
      due_date_from,
      due_date_to,
    } = query;

    const queryBuilder = this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.owner", "owner");

    if (role !== "admin") {
      queryBuilder.andWhere(
        `(
          project.owner_id = :currentUserId
          OR EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = project.project_id
            AND pm.user_id = :currentUserId
          )
        )`,
        { currentUserId }
      );
    }

    if (search) {
      queryBuilder.andWhere(
        `(
          LOWER(project.name) LIKE LOWER(:search)
          OR LOWER(project.key) LIKE LOWER(:search)
          OR LOWER(COALESCE(project.description, '')) LIKE LOWER(:search)
        )`,
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere(
        "project.status = :status",
        { status }
      );
    }

    if (priority) {
      queryBuilder.andWhere(
        "project.priority = :priority",
        { priority }
      );
    }

    if (owner_id) {
      queryBuilder.andWhere(
        "project.owner_id = :owner_id",
        { owner_id }
      );
    }

    if (member_id) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = project.project_id
          AND pm.user_id = :member_id
        )`,
        { member_id }
      );
    }

    if (start_date_from) {
      queryBuilder.andWhere(
        "project.start_date >= :start_date_from",
        { start_date_from }
      );
    }

    if (start_date_to) {
      queryBuilder.andWhere(
        "project.start_date <= :start_date_to",
        { start_date_to }
      );
    }

    if (due_date_from) {
      queryBuilder.andWhere(
        "project.due_date >= :due_date_from",
        { due_date_from }
      );
    }

    if (due_date_to) {
      queryBuilder.andWhere(
        "project.due_date <= :due_date_to",
        { due_date_to }
      );
    }

    const skip = (page - 1) * limit;

    queryBuilder
      .orderBy("project.created_at", "DESC")
      .skip(skip)
      .take(limit);

    const [projects, total] =
      await queryBuilder.getManyAndCount();

    return {
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProjectById(
    projectId: string,
    currentUserId: string,
    currentUserRole: string
  ) {
    const role = currentUserRole.trim().toLowerCase();

    await this.assertProjectAccess(
      projectId,
      currentUserId,
      role
    );

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
      relations: {
        owner: true,
        members: {
          user: true,
        },
        tasks: true,
        project_files: {
          file: true,
        },
        activity_logs: {
          user: true,
        },
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    return project;
  }

  async updateProject(
    projectId: string,
    data: UpdateProjectDto,
    currentUserId: string,
    currentUserRole: string
  ) {
    const role = currentUserRole.trim().toLowerCase();

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    await this.assertProjectManage(
      projectId,
      currentUserId,
      role
    );

    if (
      data.owner_id &&
      data.owner_id !== project.owner_id
    ) {
      const owner = await this.userRepository.findOne({
        where: { user_id: data.owner_id },
        relations: { role: true },
      });

      if (!owner) {
        throw new Error("Project owner not found");
      }

      if (owner.role.name.toLowerCase() !== "manager") {
        throw new Error(
          "Project owner must have the Manager role"
        );
      }

      project.owner_id = data.owner_id;
    }

    if (
      data.key &&
      data.key !== project.key
    ) {
      const existingProject =
        await this.projectRepository.findOne({
          where: { key: data.key },
        });

      if (existingProject) {
        throw new Error("Project key already exists");
      }

      project.key = data.key;
    }

    if (data.name !== undefined) {
      project.name = data.name;
    }

    if (data.description !== undefined) {
      project.description = data.description;
    }

    if (data.status !== undefined) {
      project.status = data.status;
    }

    if (data.priority !== undefined) {
      project.priority = data.priority;
    }

    if (data.start_date !== undefined) {
      project.start_date = data.start_date
        ? new Date(data.start_date)
        : undefined;
    }

    if (data.due_date !== undefined) {
      project.due_date = data.due_date
        ? new Date(data.due_date)
        : undefined;
    }

    if (
      project.start_date &&
      project.due_date &&
      project.start_date > project.due_date
    ) {
      throw new Error(
        "Due date cannot be before start date"
      );
    }

    let updatedProject: Project;

    try {
      updatedProject =
        await this.projectRepository.save(project);
    } catch (err: any) {
      if (err?.code === "23505") {
        throw new Error("Project key already exists");
      }

      throw err;
    }

    await this.logActivity(
      projectId,
      currentUserId,
      "updated_project"
    );

    return updatedProject;
  }

  async archiveProject(
    projectId: string,
    currentUserId: string,
    currentUserRole: string
  ) {
    const role = currentUserRole.trim().toLowerCase();

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    await this.assertProjectManage(
      projectId,
      currentUserId,
      role
    );

    if (project.status === "archived") {
      throw new Error("Project is already archived");
    }

    project.status = "archived";

    await this.projectRepository.save(project);

    await this.logActivity(
      projectId,
      currentUserId,
      "archived_project"
    );

    return {
      message: "Project archived successfully",
    };
  }

  async addProjectMember(
    projectId: string,
    data: AddProjectMemberDto,
    currentUserId: string,
    currentUserRole: string
  ) {
    const role = currentUserRole.trim().toLowerCase();

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    await this.assertProjectManage(
      projectId,
      currentUserId,
      role
    );

    const user = await this.userRepository.findOne({
      where: { user_id: data.user_id },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const existingMember =
      await this.memberRepository.findOne({
        where: {
          project_id: projectId,
          user_id: data.user_id,
        },
      });

    if (existingMember) {
      throw new Error("User is already a project member");
    }

    const member = this.memberRepository.create({
      project_id: projectId,
      user_id: data.user_id,
      role: data.role,
    });

    const savedMember =
      await this.memberRepository.save(member);

    await this.logActivity(
      projectId,
      currentUserId,
      "added_member"
    );

    return savedMember;
  }

  async removeProjectMember(
    projectId: string,
    userId: string,
    currentUserId: string,
    currentUserRole: string
  ) {
    const role = currentUserRole.trim().toLowerCase();

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    await this.assertProjectManage(
      projectId,
      currentUserId,
      role
    );

    if (project.owner_id === userId) {
      throw new Error("Project owner cannot be removed");
    }

    const member = await this.memberRepository.findOne({
      where: {
        project_id: projectId,
        user_id: userId,
      },
    });

    if (!member) {
      throw new Error("Project member not found");
    }

    await this.memberRepository.remove(member);

    await this.logActivity(
      projectId,
      currentUserId,
      "removed_member"
    );

    return {
      message: "Project member removed successfully",
    };
  }

  async getProjectDashboard(
    projectId: string,
    currentUserId: string,
    currentUserRole: string
  ) {
    const role = currentUserRole.trim().toLowerCase();

    await this.assertProjectAccess(
      projectId,
      currentUserId,
      role
    );

    const project = await this.projectRepository.findOne({
      where: { project_id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const now = new Date();

    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
    ] = await Promise.all([
      this.taskRepository.count({
        where: { project_id: projectId },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: "done",
        },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: "in_progress",
        },
      }),
      this.taskRepository.count({
        where: {
          project_id: projectId,
          status: "todo",
        },
      }),
    ]);

    const progress =
      totalTasks === 0
        ? 0
        : Number(
            ((completedTasks / totalTasks) * 100).toFixed(1)
          );

    const overdueTasks = await this.taskRepository
      .createQueryBuilder("task")
      .where(
        "task.project_id = :projectId",
        { projectId }
      )
      .andWhere("task.due_date IS NOT NULL")
      .andWhere("task.due_date < :now", { now })
      .andWhere(
        "task.status NOT IN (:...excluded)",
        {
          excluded: ["done", "cancelled"],
        }
      )
      .getMany();

    const fourteenDaysFromNow = new Date(
      now.getTime() +
        14 * 24 * 60 * 60 * 1000
    );

    const upcomingDeadlines =
      await this.taskRepository
        .createQueryBuilder("task")
        .where(
          "task.project_id = :projectId",
          { projectId }
        )
        .andWhere("task.due_date IS NOT NULL")
        .andWhere("task.due_date >= :now", { now })
        .andWhere(
          "task.due_date <= :fourteenDaysFromNow",
          { fourteenDaysFromNow }
        )
        .andWhere("task.status != :done", {
          done: "done",
        })
        .getMany();

    const files =
      await this.projectFileRepository.find({
        where: { project_id: projectId },
        relations: { file: true },
      });

    const recentActivity =
      await this.activityRepository.find({
        where: { project_id: projectId },
        relations: { user: true },
        order: { created_at: "DESC" },
        take: 20,
      });

    return {
      project,
      progress,
      task_counts: {
        total: totalTasks,
        completed: completedTasks,
        in_progress: inProgressTasks,
        todo: todoTasks,
      },
      overdue_tasks: overdueTasks,
      upcoming_deadlines: upcomingDeadlines,
      files,
      recent_activity: recentActivity,
    };
  }

  private async logActivity(
    projectId: string,
    userId: string,
    action: string
  ) {
    const activity =
      this.activityRepository.create({
        project_id: projectId,
        user_id: userId,
        action,
      });

    return this.activityRepository.save(activity);
  }
}

export const projectService = new ProjectService();