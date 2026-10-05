import { Request, Response, NextFunction } from "express";
import { AuditLogsService } from "./audit-logs.service";
import { ListAuditLogsQuery } from "./audit-logs.dto";

const service = new AuditLogsService();

export class AuditLogsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = res.locals.validatedQuery as ListAuditLogsQuery;
      const result = await service.list(query);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      res.json(await service.findOne(id));
    } catch (e) {
      next(e);
    }
  }

  async projectFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = String(req.params.projectId);
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 25);
      res.json(await service.projectFeed(projectId, page, limit));
    } catch (e) {
      next(e);
    }
  }
}