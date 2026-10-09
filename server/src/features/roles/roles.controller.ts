import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import { rolesService } from "./roles.service";

export async function getAllRoles(
  _req: Request,
  res: Response<ApiResponse<any[]>>,
  _next: NextFunction
) {
  const roles = await rolesService.findAllRoles();

  const body: ApiResponse<any[]> = {
    success: true,
    statusCode: 200,
    data: roles || [],
  };
  res.status(200).json(body);
}