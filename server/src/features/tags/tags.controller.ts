import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type { TagResponse, CreateTagDto, UpdateTagDto } from "./tags.dto";
import { tagsService } from "./tags.service";
import { HttpError } from "../../shared/middleware/error.middleware";

export async function findAllTags(
  req: Request,
  res: Response<ApiResponse<TagResponse[]>>,
  _next: NextFunction
) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
  const sortOrder =
    req.query.sortOrder === "asc" || req.query.sortOrder === "desc"
      ? req.query.sortOrder
      : undefined;

  const page = await tagsService.findAll({ limit, offset }, { sortBy, sortOrder });

  res.status(200).json({
    success: true,
    statusCode: 200,
    data: page.items as TagResponse[],
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      count: page.count,
    },
  });
}

export async function findOneTag(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<TagResponse>>,
  next: NextFunction
) {
  const item = await tagsService.findOne(req.params.id);
  if (!item) {
    next(new HttpError(404, "Tag not found"));
    return;
  }
  res.status(200).json({ success: true, statusCode: 200, data: item as TagResponse });
}

export async function createTag(
  req: Request<unknown, unknown, CreateTagDto>,
  res: Response<ApiResponse<TagResponse>>,
  next: NextFunction
) {
  const required = ["name", "slug"] as const;
  for (const field of required) {
    if (!req.body[field]) {
      next(new HttpError(400, `Field '${field}' is required`));
      return;
    }
  }
  try {
    const created = await tagsService.create(req.body);
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Tag created",
      data: created as TagResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTag(
  req: Request<{ id: string }, unknown, UpdateTagDto>,
  res: Response<ApiResponse<TagResponse>>,
  next: NextFunction
) {
  try {
    const updated = await tagsService.update(req.params.id, req.body);
    if (!updated) {
      next(new HttpError(404, "Tag not found"));
      return;
    }
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Tag updated",
      data: updated as TagResponse,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeTag(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  const deleted = await tagsService.remove(req.params.id);
  if (!deleted) {
    next(new HttpError(404, "Tag not found"));
    return;
  }
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Tag deleted",
    data: true,
  });
}

export async function attachTagToContent(
  req: Request<{ tagId: string; contentId: string }>,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  try {
    await tagsService.attachToContent(req.params.tagId, req.params.contentId);
    res.status(201).json({ success: true, statusCode: 201, message: "Tag attached", data: true });
  } catch (err) {
    next(err);
  }
}

export async function detachTagFromContent(
  req: Request<{ tagId: string; contentId: string }>,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  const detached = await tagsService.detachFromContent(req.params.tagId, req.params.contentId);
  if (!detached) {
    next(new HttpError(404, "Tag was not attached to this content"));
    return;
  }
  res.status(200).json({ success: true, statusCode: 200, message: "Tag detached", data: true });
}

export async function listTagsForContent(
  req: Request<{ contentId: string }>,
  res: Response<ApiResponse<TagResponse[]>>,
  _next: NextFunction
) {
  const tags = await tagsService.listTagsForContent(req.params.contentId);
  res.status(200).json({ success: true, statusCode: 200, data: tags as TagResponse[] });
}
