import { axiosClient } from "./axiosClient";

export interface ActivityLogResponse {
  activity_id: string;
  user_id?: string;
  project_id?: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  severity: "info" | "warning" | "critical";
  description?: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  project?: {
    project_id: string;
    name: string;
  };
}

interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface SearchParams {
  q?: string;
  userId?: string;
  projectId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const auditLogApi = {
  search: (params?: SearchParams) =>
    axiosClient
      .get<ApiResponse<ActivityLogResponse[]>>("/audit-logs", { params })
      .then((res) => res.data),

  getOne: (id: string) =>
    axiosClient
      .get<ActivityLogResponse>(`/audit-logs/${id}`)
      .then((res) => res.data),
};
