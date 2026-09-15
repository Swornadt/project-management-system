import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type {
  AuthResponse,
  LoginDto,
  MeResponse,
  RegisterDto,
} from "./auth.dto";
import { authService } from "./auth.services";
import { HttpError } from "../../shared/middleware/error.middleware";

export async function registerController(
  req: Request<unknown, unknown, RegisterDto>,
  res: Response<ApiResponse<AuthResponse>>,
  next: NextFunction
) {
  try {
    const result = await authService.register(req.body);
    const body: ApiResponse<AuthResponse> = {
      success: true,
      statusCode: 201,
      message: "Registration successful",
      data: result,
    };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

export async function loginController(
  req: Request<unknown, unknown, LoginDto>,
  res: Response<ApiResponse<AuthResponse>>,
  next: NextFunction
) {
  try {
    if (!req.body.email || !req.body.password) {
      next(new HttpError(400, "Email and password are required"));
      return;
    }
    const result = await authService.login(req.body);
    const body: ApiResponse<AuthResponse> = {
      success: true,
      statusCode: 200,
      message: "Login successful",
      data: result,
    };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

export async function meController(
  req: Request,
  res: Response<ApiResponse<MeResponse>>,
  next: NextFunction
) {
  const authHeader = req.headers.authorization ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    next(new HttpError(401, "Authorization header is missing or malformed"));
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [prefix, userId] = decoded.split(":");
    if (prefix !== "temporary" || !userId) {
      next(new HttpError(401, "Invalid token"));
      return;
    }
    const result = await authService.me(userId);
    const body: ApiResponse<MeResponse> = {
      success: true,
      statusCode: 200,
      data: result,
    };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

export async function logoutController(
  _req: Request,
  res: Response<ApiResponse<boolean>>,
  _next: NextFunction
) {
  const body: ApiResponse<boolean> = {
    success: true,
    statusCode: 200,
    message: "Logged out",
    data: true,
  };
  res.status(200).json(body);
}
