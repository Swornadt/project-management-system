import type { ApprovalStatus, PublishMode } from "../../entities/approval.entity";

export interface ApprovalResponse {
  approval_id: string;
  content_id: string;
  submitted_by: string;
  submitted_at: Date;
  reviewer_id: string | null;
  status: ApprovalStatus;
  reason: string | null;
  decided_at: Date | null;
  publish_mode: PublishMode | null;
  scheduled_for: Date | null;
  published_at: Date | null;
  notes: string | null;
}

export interface SubmitForApprovalDto {
  notes?: string;
}

export interface ApproveDto {
  publish: "immediate" | "scheduled";
  scheduled_for?: string;
}

export interface RejectDto {
  reason: string;
}