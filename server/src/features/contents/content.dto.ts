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
  author_id: string;
  title: string;
  slug: string;
  body?: string;
  status?: string;
}

export interface UpdateContentDto {
  project_id?: string;
  author_id?: string;
  title?: string;
  slug?: string;
  body?: string;
}

export interface DecideApprovalDto {
  reviewer_id: string;
  decision: "approved" | "rejected";
  reason?: string;
}
