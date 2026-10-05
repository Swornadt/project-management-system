import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../shared/middleware/auth.middleware";
import type { ApiResponse } from "../../shared/types";
import type {
  ApprovalResponse,
  ApproveDto,
  RejectDto,
  SubmitForApprovalDto,
} from "./approvals.dto";
import { approvalsService } from "./approvals.service";

export async function submitForApproval(
  req: AuthRequest,
  res: Response<ApiResponse<ApprovalResponse>>,
  next: NextFunction
) {
  try {
    const { contentId } = req.params as { contentId: string };
    const userId = req.user!.userId;
    const approval = await approvalsService.submit(
      contentId,
      userId,
      req.body as SubmitForApprovalDto
    );
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Content submitted for approval",
      data: approval as unknown as ApprovalResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function approve(
  req: AuthRequest,
  res: Response<ApiResponse<ApprovalResponse>>,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const approval = await approvalsService.approve(id, userId, req.body as ApproveDto);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Approval recorded",
      data: approval as unknown as ApprovalResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function reject(
  req: AuthRequest,
  res: Response<ApiResponse<ApprovalResponse>>,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const approval = await approvalsService.reject(id, userId, req.body as RejectDto);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Content rejected and returned to draft",
      data: approval as unknown as ApprovalResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancel(
  req: AuthRequest,
  res: Response<ApiResponse<ApprovalResponse>>,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const approval = await approvalsService.cancel(id, userId);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Submission withdrawn",
      data: approval as unknown as ApprovalResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function listPending(
  req: AuthRequest,
  res: Response<ApiResponse<ApprovalResponse[]>>,
  _next: NextFunction
) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  const page = await approvalsService.listPending(
    req.user!.roleName ?? "Employee",
    req.user!.userId,
    { limit, offset }
  );
  res.status(200).json({
    success: true,
    statusCode: 200,
    data: page.items as unknown as ApprovalResponse[],
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      count: page.count,
    },
  });
}

export async function listForContent(
  req: AuthRequest,
  res: Response<ApiResponse<ApprovalResponse[]>>,
  _next: NextFunction
) {
  const { contentId } = req.params as { contentId: string };
  const rows = await approvalsService.listForContent(contentId);
  res.status(200).json({
    success: true,
    statusCode: 200,
    data: rows as unknown as ApprovalResponse[],
  });
}