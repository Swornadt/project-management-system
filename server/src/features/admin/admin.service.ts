import { AppDataSource } from "../../shared/db/data-source";
import { User } from "../../entities/user.entity";
import { Project } from "../../entities/project.entity";
import { Task } from "../../entities/task.entity";
import { Content } from "../../entities/content.entity";
import { IsNull, Not, MoreThan } from "typeorm";

export class AdminService {
  async getDashboardStats() {
    const userRepo = AppDataSource.getRepository(User);
    const projectRepo = AppDataSource.getRepository(Project);
    const taskRepo = AppDataSource.getRepository(Task);
    const contentRepo = AppDataSource.getRepository(Content);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      totalContent,
      publishedContent,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      userRepo.count({ where: { deleted_at: IsNull() } }),
      userRepo.count({ where: { deleted_at: IsNull(), status: 'active' } }),
      projectRepo.count(),
      projectRepo.count({ where: { status: 'Active' } }),
      taskRepo.count(),
      taskRepo.count({ where: { status: 'Done' } }),
      contentRepo.count(),
      contentRepo.count({ where: { status: 'Published' } }),
      userRepo.count({ where: { deleted_at: IsNull(), created_at: MoreThan(thirtyDaysAgo) } }),
      projectRepo.count({ where: { created_at: MoreThan(thirtyDaysAgo) } }),
    ]);

    const tasksByStatus = await taskRepo
      .createQueryBuilder("task")
      .select("task.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("task.status")
      .getRawMany();

    const projectsByStatus = await projectRepo
      .createQueryBuilder("project")
      .select("project.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("project.status")
      .getRawMany();

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        recentlyCreated: recentUsers,
      },
      projects: {
        total: totalProjects,
        active: activeProjects,
        recentlyCreated: recentProjects,
        byStatus: projectsByStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {} as Record<string, number>),
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: totalTasks - completedTasks,
        byStatus: tasksByStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {} as Record<string, number>),
      },
      content: {
        total: totalContent,
        published: publishedContent,
        draft: totalContent - publishedContent,
      },
    };
  }
}

export const adminService = new AdminService();
