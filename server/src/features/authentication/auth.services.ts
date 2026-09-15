import { usersService } from "../users/users.service";
import { rolesService } from "../roles/roles.service";
import type { LoginDto, RegisterDto, AuthResponse, MeResponse } from "./auth.dto";
import { HttpError } from "../../shared/middleware/error.middleware";

export class AuthService {
  private issueToken(userId: string): string {
    return Buffer.from(`temporary:${userId}:${Date.now()}`, "utf-8").toString(
      "base64"
    );
  }

  async login(payload: LoginDto): Promise<AuthResponse> {
    const user = await usersService.findByEmail(payload.email);
    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }
    const ok = await usersService.verifyPassword(payload.password, user.password_hash);
    if (!ok) {
      throw new HttpError(401, "Invalid email or password");
    }
    if (user.status !== "active") {
      throw new HttpError(403, "Account is not active");
    }
    return {
      user: {
        user_id: user.user_id,
        role_id: user.role_id,
        role_name: user.role?.name,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        status: user.status,
      },
      token: this.issueToken(user.user_id),
    };
  }

  async register(payload: RegisterDto): Promise<AuthResponse> {
    const required = ["first_name", "last_name", "email", "password"] as const;
    for (const field of required) {
      if (!(payload as unknown as Record<string, unknown>)[field]) {
        throw new HttpError(400, `Field '${field}' is required`);
      }
    }
    const existing = await usersService.findByEmail(payload.email);
    if (existing) {
      throw new HttpError(409, "Email already registered");
    }

    let roleId = payload.role_id;
    if (!roleId) {
      const employeeRole = await rolesService.findByName("Employee");
      roleId = employeeRole?.role_id;
      if (!roleId) {
        throw new HttpError(500, "Default role not available");
      }
    }

    const created = await usersService.create({
      role_id: roleId,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      password: payload.password,
      status: "active",
    });

    const withRole = await usersService.findOneWithRole(created.user_id);
    if (!withRole) {
      throw new HttpError(500, "Failed to load created user");
    }

    return {
      user: {
        user_id: withRole.user_id,
        role_id: withRole.role_id,
        role_name: withRole.role?.name,
        first_name: withRole.first_name,
        last_name: withRole.last_name,
        email: withRole.email,
        status: withRole.status,
      },
      token: this.issueToken(withRole.user_id),
    };
  }

  async me(userId: string): Promise<MeResponse> {
    const user = await usersService.findOneWithRole(userId);
    if (!user) {
      throw new HttpError(404, "User not found");
    }
    return {
      user: {
        user_id: user.user_id,
        role_id: user.role_id,
        role_name: user.role?.name,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        status: user.status,
      },
    };
  }
}

export const authService = new AuthService();
