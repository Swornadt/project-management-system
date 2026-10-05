import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware";
import { AppDataSource } from "../db/data-source";
import { ActivityLog, AuditSeverity } from "../../entities/activity-log.entity";

declare global {
  namespace Express {
    interface Request {
      auditContext?: AuditContext;
    }
  }
}

export interface AuditContext {
  userId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  projectId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export function auditContext(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const user = req.user;
  req.auditContext = {
    userId: user?.userId ?? null,
    actorEmail: user?.email ?? null,
    actorRole: user?.roleName ?? null,
    projectId:
      (req.params?.projectId as string | undefined) ??
      (req.body?.project_id as string | undefined) ??
      null,
    ip: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
    requestId: (req as any).id ?? null,
  };
  next();
}

export interface WriteAuditInput {
  ctx: AuditContext;
  action: string;
  entityType: string;
  entityId?: string | null;
  projectId?: string | null;
  description?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
}

export async function writeAudit(input: WriteAuditInput): Promise<void> {
  try {
    const repo = AppDataSource.getRepository(ActivityLog);

    const metadata: Record<string, any> = {
      ...(input.metadata ?? {}),
      requestId: input.ctx.requestId ?? null,
    };

    await repo.insert({
      user_id: input.ctx.userId,
      actor_email: input.ctx.actorEmail ?? null,
      actor_role: input.ctx.actorRole ?? null,
      project_id: input.projectId ?? input.ctx.projectId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      description: input.description ?? null,
      before_data: input.before ?? null,
      after_data: input.after ?? null,
      metadata,
      ip_address: input.ctx.ip ?? null,
      user_agent: input.ctx.userAgent ?? null,
      severity: input.severity ?? AuditSeverity.INFO,
    });
  } catch (err) {
    console.error("[audit] write failed:", (err as Error).message);
  }
}