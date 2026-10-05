import { AuditSeverity } from "../../entities/activity-log.entity";

export interface ListAuditLogsQuery {
  q: string | undefined;
  userId: string | undefined;
  projectId: string | undefined;
  action: string | undefined;
  entityType: string | undefined;
  entityId: string | undefined;
  severity: AuditSeverity | undefined;
  from: string | undefined;
  to: string | undefined;
  sort: string | undefined;
  order: "asc" | "desc";
  page: number;
  limit: number;
}

const MAX_LIMIT = 100;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export const listAuditLogsQuerySchema = {
  parse(raw: Record<string, unknown>): {
    value: ListAuditLogsQuery;
    errors: string[];
  } {
    const errors: string[] = [];

    const page = Number(raw.page ?? 1);
    const limit = Number(raw.limit ?? 25);

    if (!Number.isInteger(page) || page < 1) {
      errors.push("page must be an integer >= 1");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      errors.push(`limit must be an integer between 1 and ${MAX_LIMIT}`);
    }

    let order: "asc" | "desc" = "desc";
    if (raw.order === "asc" || raw.order === "desc") {
      order = raw.order;
    } else if (raw.order !== undefined) {
      errors.push("order must be 'asc' or 'desc'");
    }

    let severity: AuditSeverity | undefined;
    if (
      raw.severity === AuditSeverity.INFO ||
      raw.severity === AuditSeverity.WARNING ||
      raw.severity === AuditSeverity.CRITICAL
    ) {
      severity = raw.severity as AuditSeverity;
    } else if (raw.severity !== undefined) {
      errors.push("severity must be one of: info, warning, critical");
    }

    const fromRaw = raw.from;
    let from: string | undefined;
    if (typeof fromRaw === "string" && fromRaw.length > 0) {
      const parsed = Date.parse(fromRaw);
      if (Number.isNaN(parsed)) {
        errors.push("from must be a valid ISO date");
      } else {
        from = new Date(parsed).toISOString();
      }
    }

    const toRaw = raw.to;
    let to: string | undefined;
    if (typeof toRaw === "string" && toRaw.length > 0) {
      const parsed = Date.parse(toRaw);
      if (Number.isNaN(parsed)) {
        errors.push("to must be a valid ISO date");
      } else {
        to = new Date(parsed).toISOString();
      }
    }

    const value: ListAuditLogsQuery = {
      q: str(raw.q),
      userId: str(raw.userId),
      projectId: str(raw.projectId),
      action: str(raw.action),
      entityType: str(raw.entityType),
      entityId: str(raw.entityId),
      severity,
      from,
      to,
      sort: str(raw.sort),
      order,
      page,
      limit,
    };

    return { value, errors };
  },
};