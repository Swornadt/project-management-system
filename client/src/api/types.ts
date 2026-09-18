// Mirrors the backend's DTOs exactly (server/src/features/contents/content.dto.ts).
// This file is the API's shape — not the UI's. Never add display-only fields
// (icons, colors, formatted dates) here; those belong in the mapper.

export type ApiContentStatus = "draft" | "pending_approval" | "approved" | "published";

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

export interface ApiCreateContentDto {
  project_id: string;
  author_id: string;
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

export interface ApiDecideApprovalDto {
  reviewer_id: string;
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
