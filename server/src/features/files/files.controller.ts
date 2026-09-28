import type { Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type { AuthRequest } from "../../shared/middleware/auth.middleware";
import type { FileResponse } from "./files.dto";
import { filesService } from "./files.service";
import { HttpError } from "../../shared/middleware/error.middleware";
import { resolveFullPath } from "./file.storage";

function requireUserId(req: AuthRequest): string {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user.userId;
}
export async function uploadFile(
  req: AuthRequest,
  res: Response<ApiResponse<FileResponse>>,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req);
    if (!req.file) {
      next(new HttpError(400, "No file provided"));
      return;
    }
    const { project_id, task_id, content_id } = req.body;
    const file = await filesService.upload(userId, req.file, {
      project_id,
      task_id,
      content_id,
    });
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "File uploaded",
      data: filesService.toResponse(file),
    });
  } catch (err) {
    next(err);
  }
}
export async function uploadAvatar(
  req: AuthRequest,
  res: Response<ApiResponse<FileResponse>>,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req);
    if (!req.file) {
      next(new HttpError(400, "No file provided"));
      return;
    }
    const file = await filesService.setAvatar(userId, req.file);
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Avatar updated",
      data: filesService.toResponse(file),
    });
  } catch (err) {
    next(err);
  }
}

export async function listProjectFiles(
  req: AuthRequest,
  res: Response<ApiResponse<FileResponse[]>>,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req);
    const files = await filesService.listForProject(userId, req.params.projectId as string);
    res.status(200).json({
      success: true,
      statusCode: 200,
      data: files.map((f) => filesService.toResponse(f)),
    });
  } catch (err) {
    next(err);
  }
}
export async function listTaskFiles(
  req: AuthRequest,
  res: Response<ApiResponse<FileResponse[]>>,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req);
    const files = await filesService.listForTask(userId, req.params.taskId as string);
    res.status(200).json({
      success: true,
      statusCode: 200,
      data: files.map((f) => filesService.toResponse(f)),
    });
  } catch (err) {
    next(err);
  }
}
export async function listContentFiles(
  req: AuthRequest,
  res: Response<ApiResponse<FileResponse[]>>,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req);
    const files = await filesService.listForContent(userId, req.params.contentId as string);
    res.status(200).json({
      success: true,
      statusCode: 200,
      data: files.map((f) => filesService.toResponse(f)),
    });
  } catch (err) {
    next(err);
  }
}

export async function softDeleteFile(
  req: AuthRequest,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req);
    await filesService.softDelete(req.params.id as string, userId);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "File deleted",
      data: true,
    });
  } catch (err) {
    next(err);
  }
}
export async function streamFile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req);
    const fileId = req.params.id as string;

    const file = await filesService.findOne(fileId);
    if (!file || file.deleted_at) {
      next(new HttpError(404, "File not found"));
      return;
    }

    await filesService.assertCanViewFile(userId, fileId);

    const fullPath = resolveFullPath(file.storage_key);
    res.setHeader("Content-Type", file.mime_type);
    res.setHeader("Cache-Control", "private, max-age=3600");
    if (req.query.download) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(file.original_name)}"`
      );
    }
    res.sendFile(fullPath, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
}