import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../shared/middleware/auth.middleware";
import type { ApiResponse } from "../../shared/types";
import { authService } from "./auth.service";
import type {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  RefreshTokenDto,
  AuthResponse,
  RefreshResponse,
  MeResponse,
} from "./auth.dto";

export async function register(
  req: Request<unknown, unknown, RegisterDto>,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
) {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const result = await authService.register(req.body, ipAddress);

    res.status(201).json({
      success: true,
      statusCode: 201,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(
  req: Request<unknown, unknown, VerifyEmailDto>,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
) {
  try {
    const result = await authService.verifyEmail(req.body.token);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request<unknown, unknown, LoginDto>,
  res: Response<ApiResponse<AuthResponse>>,
  next: NextFunction
) {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get("user-agent");

    const result = await authService.login(req.body, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(
  req: Request<unknown, unknown, RefreshTokenDto>,
  res: Response<ApiResponse<RefreshResponse>>,
  next: NextFunction
) {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get("user-agent");

    const result = await authService.refresh(req.body.refreshToken, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req: Request<unknown, unknown, RefreshTokenDto>,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
) {
  try {
    const result = await authService.logout(req.body.refreshToken);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request<unknown, unknown, ForgotPasswordDto>,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
) {
  try {
    const result = await authService.forgotPassword(req.body.email);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request<unknown, unknown, ResetPasswordDto>,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
) {
  try {
    const result = await authService.resetPassword(req.body.token, req.body.password);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(
  req: AuthRequest,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        statusCode: 401,
        error: "Authentication required",
      });
      return;
    }

    const result = await authService.changePassword(
      req.user.userId,
      (req.body as ChangePasswordDto).currentPassword,
      (req.body as ChangePasswordDto).newPassword
    );

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(
  req: AuthRequest,
  res: Response<ApiResponse<MeResponse>>,
  next: NextFunction
) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        statusCode: 401,
        error: "Authentication required",
      });
      return;
    }

    const user = await authService.getProfile(req.user.userId);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}
