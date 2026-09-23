import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type {
  ContentResponse,
  CreateContentDto,
  UpdateContentDto,
  DecideApprovalDto,
} from "./content.dto";
import { contentService } from "./content.service";
import { HttpError } from "../../shared/middleware/error.middleware";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export async function findAllContent(
  req: Request,
  res: Response<ApiResponse<ContentResponse[]>>,
  _next: NextFunction
) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
  const sortOrder =
    req.query.sortOrder === "asc" || req.query.sortOrder === "desc"
      ? req.query.sortOrder
      : undefined;

  const page = await contentService.findAll(
    { limit, offset },
    { sortBy, sortOrder }
  );

  const body: ApiResponse<ContentResponse[]> = {
    success: true,
    statusCode: 200,
    data: page.items as ContentResponse[],
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      count: page.count,
    },
  };
  res.status(200).json(body);
}

export async function findOneContent(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<ContentResponse>>,
  next: NextFunction
) {
  const item = await contentService.findOne(req.params.id);
  if (!item) {
    next(new HttpError(404, "Content not found"));
    return;
  }
  const body: ApiResponse<ContentResponse> = {
    success: true,
    statusCode: 200,
    data: item as ContentResponse,
  };
  res.status(200).json(body);
}

export async function createContent(
  req: Request<unknown, unknown, CreateContentDto>,
  res: Response<ApiResponse<ContentResponse>>,
  next: NextFunction
) {
  const required = ["project_id", "title", "slug"] as const;
  for (const field of required) {
    if (!req.body[field]) {
      next(new HttpError(400, `Field '${field}' is required`));
      return;
    }
  }
  const authorId = (req as AuthRequest).user!.userId;
  const created = await contentService.create({ ...req.body, author_id: authorId });

  const body: ApiResponse<ContentResponse> = {
    success: true,
    statusCode: 201,
    message: "Content created",
    data: created as ContentResponse,
  };
  res.status(201).json(body);
}

export async function updateContent(
  req: Request<{ id: string }, unknown, UpdateContentDto>,
  res: Response<ApiResponse<ContentResponse>>,
  next: NextFunction
) {
  const updated = await contentService.update(req.params.id, req.body);
  if (!updated) {
    next(new HttpError(404, "Content not found"));
    return;
  }
  const body: ApiResponse<ContentResponse> = {
    success: true,
    statusCode: 200,
    message: "Content updated",
    data: updated as ContentResponse,
  };
  res.status(200).json(body);
}

export async function removeContent(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  const deleted = await contentService.remove(req.params.id);
  if (!deleted) {
    next(new HttpError(404, "Content not found"));
    return;
  }
  const body: ApiResponse<boolean> = {
    success: true,
    statusCode: 200,
    message: "Content deleted",
    data: true,
  };
  res.status(200).json(body);
}

export async function submitContentForApproval(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<ContentResponse>>,
  next: NextFunction
) {
  try {
    const updated = await contentService.submitForApproval(req.params.id);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Content submitted for approval",
      data: updated as ContentResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function decideContentApproval(
  req: Request<{ id: string }, unknown, DecideApprovalDto>,
  res: Response<ApiResponse<ContentResponse>>,
  next: NextFunction
) {
  const { decision, reason } = req.body;
  const reviewer_id = (req as AuthRequest).user!.userId; 
  if (!reviewer_id || !decision) {
    next(new HttpError(400, "Fields 'reviewer_id' and 'decision' are required"));
    return;
  }
  try {
    const updated = await contentService.decideApproval(req.params.id, reviewer_id, decision, reason);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Content ${decision}`,
      data: updated as ContentResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function publishContent(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<ContentResponse>>,
  next: NextFunction
) {
  try {
    const updated = await contentService.publish(req.params.id);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Content published",
      data: updated as ContentResponse,
    });
  } catch (err) {
    next(err);
  }
}