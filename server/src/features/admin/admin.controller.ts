import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import { adminService } from "./admin.service";

export async function getAdminDashboardStats(
  _req: Request,
  res: Response<ApiResponse<any>>,
  _next: NextFunction
) {
  const stats = await adminService.getDashboardStats();
  
  const body: ApiResponse<any> = {
    success: true,
    statusCode: 200,
    data: stats,
  };
  res.status(200).json(body);
}
