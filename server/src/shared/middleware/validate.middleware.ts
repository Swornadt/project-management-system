import type { Request, Response, NextFunction } from "express";
import { HttpError } from "./error.middleware";

export function validateBody<T>(
  validator: (body: unknown) => body is T
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    if (validator(req.body)) {
      next();
    } else {
      next(new HttpError(400, "Invalid request body"));
    }
  };
}

export function requireParams(required: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const missing: string[] = [];
    for (const field of required) {
      const val = (req.body as Record<string, unknown>)[field];
      if (val === undefined || val === null || val === "") {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      next(new HttpError(400, `Missing required fields: ${missing.join(", ")}`));
      return;
    }
    next();
  };
}
