import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.util";
import { HttpError } from "./error.middleware";
import type { AccessTokenPayload } from "../utils/jwt.util";

export interface AuthRequest extends Request {
  user?: AccessTokenPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        next(new HttpError(401, "Access token expired"));
        return;
      }
      if (error.name === "JsonWebTokenError") {
        next(new HttpError(401, "Invalid access token"));
        return;
      }
    }
    next(new HttpError(401, "Authentication failed"));
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, "Authentication required"));
      return;
    }

    const userRole = req.user.roleName;

    if (!userRole || !allowedRoles.includes(userRole)) {
      next(new HttpError(403, "Insufficient permissions"));
      return;
    }

    next();
  };
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
  } catch {
    // Invalid token is ignored in optional auth
  }

  next();
}
