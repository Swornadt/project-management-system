import { AppDataSource } from "../../shared/db/data-source";
import { ActivityLog } from "../../entities/activity-log.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import { ListAuditLogsQuery } from "./audit-logs.dto";

export class AuditLogsService {
  private repo = AppDataSource.getRepository(ActivityLog);

  async list(query: ListAuditLogsQuery) {
    const qb = this.repo
      .createQueryBuilder("a")
      .leftJoinAndSelect("a.user", "user")
      .leftJoinAndSelect("a.project", "project");

    if (query.userId)     qb.andWhere("a.user_id = :uid",    { uid: query.userId });
    if (query.projectId)  qb.andWhere("a.project_id = :pid", { pid: query.projectId });
    if (query.action)     qb.andWhere("a.action = :action",  { action: query.action });
    if (query.entityType) qb.andWhere("a.entity_type = :et", { et: query.entityType });
    if (query.entityId)   qb.andWhere("a.entity_id = :eid",  { eid: query.entityId });
    if (query.severity)   qb.andWhere("a.severity = :sev",   { sev: query.severity });
    if (query.from)       qb.andWhere("a.created_at >= :from", { from: query.from });
    if (query.to)         qb.andWhere("a.created_at <= :to",   { to: query.to });

    if (query.q) {
      qb.andWhere(
        `(
          to_tsvector('english',
            coalesce(a.action,'')       || ' ' ||
            coalesce(a.entity_type,'')  || ' ' ||
            coalesce(a.actor_email,'')  || ' ' ||
            coalesce(a.description,'')
          ) @@ plainto_tsquery('english', :q)
          OR a.actor_email ILIKE :qLike
          OR a.description ILIKE :qLike
          OR a.action ILIKE :qLike
          OR a.entity_type ILIKE :qLike
        )`,
        { q: query.q, qLike: `%${query.q}%` },
      );
    }

    const sortable = ["created_at", "action", "entity_type", "severity"];
    const sort = sortable.includes(query.sort as string)
      ? query.sort!
      : "created_at";
    qb.orderBy(`a.${sort}`, query.order.toUpperCase() as "ASC" | "DESC");

    const page = query.page;
    const limit = Math.min(query.limit, 100);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

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
      relations: { user: true, project: true },
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
      relations: { user: true },
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