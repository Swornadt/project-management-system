import type { Request, Response, NextFunction, RequestHandler } from "express";
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
  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
  }

  const body: ApiResponse<never> = {
    success: false,
    error: message,
    statusCode,
  };

  res.status(statusCode).json(body);
}
