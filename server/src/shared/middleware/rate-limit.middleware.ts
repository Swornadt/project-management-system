import type { Request, Response, NextFunction } from "express";
import { HttpError } from "./error.middleware";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxAttempts, message = "Too many requests" } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${identifier}:${req.path}`;
    const now = Date.now();

    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      next();
      return;
    }

    store[key].count += 1;

    if (store[key].count > maxAttempts) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      next(new HttpError(429, message));
      return;
    }

    next();
  };
}

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  message: "Too many login attempts, please try again later",
});

export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 10,
  message: "Too many password reset requests, please try again later",
});

export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 10,
  message: "Too many registration attempts, please try again later",
});

setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (Object.prototype.hasOwnProperty.call(store, key) && store[key]!.resetTime < now) {
      delete store[key];
    }
  }
}, 60 * 1000);
