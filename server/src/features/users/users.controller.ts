import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type {
  CreateUserDto,
  UpdateUserDto,
  UserResponse,
  UserWithRoleResponse,
} from "./users.dto";
import { usersService } from "./users.service";
import { HttpError } from "../../shared/middleware/error.middleware";

export async function findAllUsers(
  req: Request,
  res: Response<ApiResponse<UserResponse[]>>,
  _next: NextFunction
) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
  const sortOrder =
    req.query.sortOrder === "asc" || req.query.sortOrder === "desc"
      ? req.query.sortOrder
      : undefined;

  const page = await usersService.findAll(
    { limit, offset },
    { sortBy, sortOrder }
  );

  const data: UserResponse[] = page.items.map((u) => usersService.toResponse(u)) as UserResponse[];

  const body: ApiResponse<UserResponse[]> = {
    success: true,
    statusCode: 200,
    data,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      count: page.count,
    },
  };
  res.status(200).json(body);
}

export async function findOneUser(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<UserWithRoleResponse>>,
  next: NextFunction
) {
  const item = await usersService.findOneWithRole(req.params.id);
  if (!item) {
    next(new HttpError(404, "User not found"));
    return;
  }
  const body: ApiResponse<UserWithRoleResponse> = {
    success: true,
    statusCode: 200,
    data: usersService.toResponse(item) as UserWithRoleResponse,
  };
  res.status(200).json(body);
}

export async function createUser(
  req: Request<unknown, unknown, CreateUserDto>,
  res: Response<ApiResponse<UserResponse>>,
  next: NextFunction
) {
  const required = ["role_id", "first_name", "last_name", "email", "password"] as const;
  for (const field of required) {
    if (!req.body[field]) {
      next(new HttpError(400, `Field '${field}' is required`));
      return;
    }
  }
  const existing = await usersService.findByEmail(req.body.email);
  if (existing) {
    next(new HttpError(409, "Email already registered"));
    return;
  }
  const created = await usersService.create(req.body);
  const body: ApiResponse<UserResponse> = {
    success: true,
    statusCode: 201,
    message: "User created",
    data: usersService.toResponse(created) as UserResponse,
  };
  res.status(201).json(body);
}

export async function updateUser(
  req: Request<{ id: string }, unknown, UpdateUserDto>,
  res: Response<ApiResponse<UserResponse>>,
  next: NextFunction
) {
  const updated = await usersService.update(req.params.id, req.body);
  if (!updated) {
    next(new HttpError(404, "User not found"));
    return;
  }
  const body: ApiResponse<UserResponse> = {
    success: true,
    statusCode: 200,
    message: "User updated",
    data: usersService.toResponse(updated) as UserResponse,
  };
  res.status(200).json(body);
}

export async function removeUser(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<boolean>>,
  next: NextFunction
) {
  const deleted = await usersService.remove(req.params.id);
  if (!deleted) {
    next(new HttpError(404, "User not found"));
    return;
  }
  const body: ApiResponse<boolean> = {
    success: true,
    statusCode: 200,
    message: "User deleted",
    data: true,
  };
  res.status(200).json(body);
}
