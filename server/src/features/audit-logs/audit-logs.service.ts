import { AppDataSource } from "../../shared/db/data-source";
import { ActivityLog } from "../../entities/activity-log.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import { ListAuditLogsQuery } from "./audit-logs.dto";

export class AuditLogsService {
  private repo = AppDataSource.getRepository(ActivityLog);

  async list(query: ListAuditLogsQuery) {
    const where: any = {};
    
    if (query.userId) where.user_id = query.userId;
    if (query.projectId) where.project_id = query.projectId;
    if (query.action) where.action = query.action;
    if (query.entityType) where.entity_type = query.entityType;
    if (query.entityId) where.entity_id = query.entityId;
    if (query.severity) where.severity = query.severity;

    const page = query.page;
    const limit = Math.min(query.limit, 100);

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { created_at: query.order.toUpperCase() as "ASC" | "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(activityId: string) {
    const log = await this.repo.findOne({
      where: { activity_id: activityId },
    });
    if (!log) {
      throw new HttpError(404, "Audit log not found");
    }
    return log;
  }

  async projectFeed(projectId: string, page = 1, limit = 25) {
    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.repo.findAndCount({
      where: { project_id: projectId },
      order: { created_at: "DESC" },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      data,
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasNext: page * safeLimit < total,
        hasPrev: page > 1,
      },
    };
  }
}