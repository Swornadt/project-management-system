// Mirrors the backend's DTOs exactly (server/src/features/contents/content.dto.ts).
// This file is the API's shape — not the UI's. Never add display-only fields
// (icons, colors, formatted dates) here; those belong in the mapper.

export type ApiContentStatus = "draft" | "pending_approval" | "approved" | "published";

export interface ApiProjectResponse {
  project_id: string;
  key_code: string;
  name: string;
  description?: string | null;
  owner_id: string;
  status: string;
  priority: string;
  start_date?: string | null;
  due_date?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  // Only present when the endpoint joins them (list: owner; dashboard: owner + members).
  owner?: ApiUserSummary;
  members?: ApiProjectMember[];
}

export interface ApiUserSummary {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface ApiProjectMember {
  project_id: string;
  user_id: string;
  role: string; // "manager" | "member"
  joined_at: string;
}

// GET /projects/:id/dashboard — trimmed to what the details screen uses.
export interface ApiProjectDashboard {
  project: ApiProjectResponse;
  progress: number; // 0-100
  task_counts: { total: number; completed: number; in_progress: number; todo: number };
  overdue_tasks: { task_id: string; title: string; due_date?: string }[];
}

// Mirrors server/src/features/projects/project.dto.ts
export interface ApiCreateProjectDto {
  name: string;
  key_code: string;
  description?: string;
  status?: string;
  priority?: string;
  start_date?: string;
  due_date?: string;
}

export type ApiUpdateProjectDto = Partial<Omit<ApiCreateProjectDto, "key_code">>;

// The raw shape GET /projects actually sends — a different convention than
// every other list endpoint (array nested under .projects, pagination
// nested under .pagination as page/per_page/total_pages rather than a
// sibling `meta` with limit/offset/count). Not meant to be used directly by
// components — projectApi.list() below translates this into the same
// ApiResponse<ApiProjectResponse[]> shape every other *Api.list() returns,
// so callers don't need to know this discrepancy exists.
export interface ApiProjectListPage {
  projects: ApiProjectResponse[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiContentResponse {
  content_id: string;
  project_id: string;
  author_id: string;
  title: string;
  slug: string;
  body?: string;
  status: ApiContentStatus;
  version: number;
  created_at: string; // JSON dates arrive as ISO strings, not Date objects
  updated_at: string;
}

// author_id is set by the server from the login token, so it isn't sent.
export interface ApiCreateContentDto {
  project_id: string;
  title: string;
  slug: string;
  body?: string;
}

export interface ApiUpdateContentDto {
  project_id?: string;
  author_id?: string;
  title?: string;
  slug?: string;
  body?: string;
}

// reviewer_id is set by the server from the login token, so it isn't sent.
export interface ApiDecideApprovalDto {
  decision: "approved" | "rejected";
  reason?: string;
}

export interface ApiListMeta {
  total: number;
  limit: number;
  offset: number;
  count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: ApiListMeta;
}