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
    const invalidType: string[] = [];

    for (const field of required) {
      const val = (req.body as Record<string, unknown>)[field];

      // 1. Missing check (undefined, null, empty string)
      if (val === undefined || val === null || val === "") {
        missing.push(field);
        continue;
      }

      // 2. Type check — all required body fields must be strings
      if (typeof val !== "string") {
        invalidType.push(field);
      }
    }

    if (missing.length > 0) {
      next(new HttpError(400, `Missing required fields: ${missing.join(", ")}`));
      return;
    }

    if (invalidType.length > 0) {
      next(
        new HttpError(
          400,
          `Invalid type for fields (expected string): ${invalidType.join(", ")}`
        )
      );
      return;
    }

    next();
  };
}

export interface QuerySchema<T> {
  parse: (raw: Record<string, unknown>) => { value: T; errors: string[] };
}

export function validateQuery<T>(schema: QuerySchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { value, errors } = schema.parse(req.query as Record<string, unknown>);

    if (errors.length > 0) {
      next(new HttpError(400, `Invalid query parameters: ${errors.join("; ")}`));
      return;
    }
    res.locals.validatedQuery = value;

    next();
  };
}