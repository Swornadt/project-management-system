import { axiosClient } from "./axiosClient";
import type { ApiResponse } from "./types";

// Mirrors server/src/features/approvals/approvals.dto.ts (ApprovalResponse).
export interface ApiApproval {
  approval_id: string;
  content_id: string;
  submitted_by: string;
  submitted_at: string;
  reviewer_id: string | null;
  status: string;
  reason: string | null;
  decided_at: string | null;
  publish_mode: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  notes: string | null;
}

export const approvalApi = {
  // Admin/Manager only. Managers only see approvals for projects they belong to.
  listPending: (params?: { limit?: number; offset?: number }) =>
    axiosClient
      .get<ApiResponse<ApiApproval[]>>("/approvals/pending", { params })
      .then((res) => res.data),
};
