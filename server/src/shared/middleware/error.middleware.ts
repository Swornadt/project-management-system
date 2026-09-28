import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import type { ApiResponse } from "../types";

export class HttpError extends Error {
  public readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
}

export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    const body = {
      success: false,
      error: "Validation failed",
      details: err.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
      statusCode: 400,
    } as unknown as ApiResponse<never>;

    return res.status(400).json(body);
  }

  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    const pgCode = (err as any).code;

    if (pgCode === "22P02") {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format",
        statusCode: 400,
      });
    }

    if (pgCode === "23505") {
      return res.status(409).json({
        success: false,
        error: "Resource already exists",
        statusCode: 409,
      });
    }

    if (pgCode === "23503") {
      return res.status(400).json({
        success: false,
        error: "Referenced resource does not exist",
        statusCode: 400,
      });
    }

    if (pgCode === "23502") {
      return res.status(400).json({
        success: false,
        error: "Missing required field",
        statusCode: 400,
      });
    }

    console.error("[errorHandler]", err);

    if (process.env.NODE_ENV !== "production") {
      message = err.message;
    } else {
      message = "Internal server error";
    }
  }

  const body: ApiResponse<never> = {
    success: false,
    error: message,
    statusCode,
  };

  res.status(statusCode).json(body);
}