import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../shared/types";
import type {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangeRoleDto,
  UpdateStatusDto,
  SearchUsersDto,
  UserResponse,
  UserWithRoleResponse,
  UserStatsResponse,
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

export async function searchUsers(
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

  const filters: SearchUsersDto = {};

  if (typeof req.query.q === "string") {
    filters.q = req.query.q;
  }

  if (typeof req.query.role === "string") {
    filters.role = req.query.role;
  }

  if (typeof req.query.status === "string") {
    filters.status = req.query.status;
  }

  if (req.query.email_verified === "true") {
    filters.email_verified = true;
  } else if (req.query.email_verified === "false") {
    filters.email_verified = false;
  }

  const page = await usersService.search(
    filters,
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

export async function getUserStats(
  _req: Request,
  res: Response<ApiResponse<UserStatsResponse>>,
  _next: NextFunction
) {
  const stats = await usersService.getStats();

  const body: ApiResponse<UserStatsResponse> = {
    success: true,
    statusCode: 200,
    data: stats,
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(req.body.email)) {
    next(new HttpError(400, "Invalid email format"));
    return;
  }

  if (req.body.password.length < 8) {
    next(new HttpError(400, "Password must be at least 8 characters"));
    return;
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
    message: "User created successfully",
    data: usersService.toResponse(created) as UserResponse,
  };
  res.status(201).json(body);
}

export async function updateUser(
  req: Request<{ id: string }, unknown, UpdateUserDto>,
  res: Response<ApiResponse<UserResponse>>,
  next: NextFunction
) {
  if (req.body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      next(new HttpError(400, "Invalid email format"));
      return;
    }

    const existing = await usersService.findByEmail(req.body.email);
    if (existing && existing.user_id !== req.params.id) {
      next(new HttpError(409, "Email already in use"));
      return;
    }
  }

  if (req.body.password && req.body.password.length < 8) {
    next(new HttpError(400, "Password must be at least 8 characters"));
    return;
  }

  const updated = await usersService.update(req.params.id, req.body);
  if (!updated) {
    next(new HttpError(404, "User not found"));
    return;
  }

  const body: ApiResponse<UserResponse> = {
    success: true,
    statusCode: 200,
    message: "User updated successfully",
    data: usersService.toResponse(updated) as UserResponse,
  };
  res.status(200).json(body);
}

export async function updateOwnProfile(
  req: Request<unknown, unknown, UpdateProfileDto> & { user?: any },
  res: Response<ApiResponse<UserResponse>>,
  next: NextFunction
) {
  const userId = req.user?.userId;
  if (!userId) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }

  if (req.body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      next(new HttpError(400, "Invalid email format"));
      return;
    }

    const existing = await usersService.findByEmail(req.body.email);
    if (existing && existing.user_id !== userId) {
      next(new HttpError(409, "Email already in use"));
      return;
    }
  }

  const updated = await usersService.update(userId, req.body);
  if (!updated) {
    next(new HttpError(404, "User not found"));
    return;
  }

  const body: ApiResponse<UserResponse> = {
    success: true,
    statusCode: 200,
    message: "Profile updated successfully",
    data: usersService.toResponse(updated) as UserResponse,
  };
  res.status(200).json(body);
}

export async function changeUserRole(
  req: Request<{ id: string }, unknown, ChangeRoleDto> & { user?: any },
  res: Response<ApiResponse<UserResponse>>,
  next: NextFunction
) {
  const currentUser = req.user;
  
  if (req.params.id === currentUser?.userId) {
    next(new HttpError(400, "Cannot change your own role"));
    return;
  }

  if (!req.body.role_id) {
    next(new HttpError(400, "Field 'role_id' is required"));
    return;
  }

  const updated = await usersService.updateRole(req.params.id, req.body.role_id);
  if (!updated) {
    next(new HttpError(404, "User not found"));
    return;
  }

  const body: ApiResponse<UserResponse> = {
    success: true,
    statusCode: 200,
    message: "User role updated successfully",
    data: usersService.toResponse(updated) as UserResponse,
  };
  res.status(200).json(body);
}

export async function updateUserStatus(
  req: Request<{ id: string }, unknown, UpdateStatusDto> & { user?: any },
  res: Response<ApiResponse<UserResponse>>,
  next: NextFunction
) {
  const currentUser = req.user;

  if (req.params.id === currentUser?.userId) {
    next(new HttpError(400, "Cannot change your own status"));
    return;
  }

  if (!req.body.status) {
    next(new HttpError(400, "Field 'status' is required"));
    return;
  }

  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(req.body.status)) {
    next(new HttpError(400, "Invalid status value"));
    return;
  }

  const updated = await usersService.updateStatus(req.params.id, req.body.status);
  if (!updated) {
    next(new HttpError(404, "User not found"));
    return;
  }

  if (req.body.status === 'inactive' || req.body.status === 'suspended') {
    await usersService.revokeAllTokens(req.params.id);
  }

  const body: ApiResponse<UserResponse> = {
    success: true,
    statusCode: 200,
    message: "User status updated successfully",
    data: usersService.toResponse(updated) as UserResponse,
  };
  res.status(200).json(body);
}

export async function deactivateUser(
  req: Request<{ id: string }> & { user?: any },
  res: Response<ApiResponse<UserResponse>>,
  next: NextFunction
) {
  const currentUser = req.user;

  if (req.params.id === currentUser?.userId) {
    next(new HttpError(400, "Cannot deactivate your own account"));
    return;
  }

  const updated = await usersService.updateStatus(req.params.id, 'inactive');
  if (!updated) {
    next(new HttpError(404, "User not found"));
    return;
  }

  await usersService.revokeAllTokens(req.params.id);

  const body: ApiResponse<UserResponse> = {
    success: true,
    statusCode: 200,
    message: "User deactivated successfully",
    data: usersService.toResponse(updated) as UserResponse,
  };
  res.status(200).json(body);
}

export async function activateUser(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<UserResponse>>,
  next: NextFunction
) {
  const updated = await usersService.updateStatus(req.params.id, 'active');
  if (!updated) {
    next(new HttpError(404, "User not found"));
    return;
  }

  const body: ApiResponse<UserResponse> = {
    success: true,
    statusCode: 200,
    message: "User activated successfully",
    data: usersService.toResponse(updated) as UserResponse,
  };
  res.status(200).json(body);
}

export async function removeUser(
  req: Request<{ id: string }> & { user?: any },
  res: Response<ApiResponse<{ deleted: boolean }>>,
  next: NextFunction
) {
  const currentUser = req.user;

  if (req.params.id === currentUser?.userId) {
    next(new HttpError(400, "Cannot delete your own account"));
    return;
  }

  const deleted = await usersService.softDelete(req.params.id);
  if (!deleted) {
    next(new HttpError(404, "User not found"));
    return;
  }

  await usersService.revokeAllTokens(req.params.id);

  const body: ApiResponse<{ deleted: boolean }> = {
    success: true,
    statusCode: 200,
    message: "User deleted successfully",
    data: { deleted: true },
  };
  res.status(200).json(body);
}

export async function restoreUser(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<UserResponse>>,
  next: NextFunction
) {
  const restored = await usersService.restore(req.params.id);
  if (!restored) {
    next(new HttpError(404, "User not found or not deleted"));
    return;
  }

  const body: ApiResponse<UserResponse> = {
    success: true,
    statusCode: 200,
    message: "User restored successfully",
    data: usersService.toResponse(restored) as UserResponse,
  };
  res.status(200).json(body);
}
