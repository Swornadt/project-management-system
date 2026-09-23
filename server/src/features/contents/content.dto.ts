export interface ContentResponse {
  content_id: string;
  project_id: string;
  author_id: string;
  title: string;
  slug: string;
  body?: string;
  status: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateContentDto {
  project_id: string;
  author_id: string; // set by the controller from the auth token, not sent by the client
  title: string;
  slug: string;
  body?: string;
}

export interface UpdateContentDto {
  project_id?: string;
  author_id?: string;
  title?: string;
  slug?: string;
  body?: string;
}

export interface DecideApprovalDto {
  decision: "approved" | "rejected";
  reason?: string;
}
