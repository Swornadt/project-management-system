import bcrypt from "bcryptjs";
import { getRepo } from "../../shared/db/repositories";
import { User } from "../../entities/user.entity";
import { RefreshToken } from "../../entities/refresh-token.entity";
import { Role } from "../../entities/role.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import { emailService } from "../../shared/services/email.service";
import {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  hashToken,
  getRefreshTokenExpiration,
  verifyRefreshToken,
} from "../../shared/utils/jwt.util";
import type {
  RegisterDto,
  LoginDto,
  AuthResponse,
  UserProfile,
  RefreshResponse,
} from "./auth.dto";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

class AuthService {
  private async getUserProfile(user: User): Promise<UserProfile> {
    return {
      user_id: user.user_id,
      role_id: user.role_id,
      role_name: user.role?.name,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      status: user.status,
      email_verified: user.email_verified,
      created_at: user.created_at,
    };
  }

  async register(payload: RegisterDto, ipAddress?: string): Promise<{ message: string }> {
    const existingUser = await getRepo(User).findOne({
      where: { email: payload.email.toLowerCase() },
    });

    if (existingUser) {
      throw new HttpError(409, "Email already registered");
    }

    let roleId = payload.role_id;

    if (!roleId) {
      const employeeRole = await getRepo(Role).findOne({
        where: { name: "Employee" },
      });

      if (!employeeRole) {
        throw new HttpError(500, "Default role not configured");
      }

      roleId = employeeRole.role_id;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = getRepo(User).create({
      role_id: roleId,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email.toLowerCase(),
      password_hash: passwordHash,
      status: "pending",
      email_verified: false,
      verification_token: hashToken(verificationToken),
      verification_token_expires: tokenExpiry,
      failed_login_count: 0,
    });

    await getRepo(User).save(user);

    try {
      await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.first_name
      );
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

    return {
      message: "Registration successful. Please check your email to verify your account.",
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const hashedToken = hashToken(token);

    const user = await getRepo(User).findOne({
      where: {
        verification_token: hashedToken,
      },
    });

    if (!user) {
      throw new HttpError(400, "Invalid or expired verification token");
    }

    if (user.verification_token_expires && user.verification_token_expires < new Date()) {
      throw new HttpError(400, "Verification token has expired");
    }

    if (user.email_verified) {
      throw new HttpError(400, "Email already verified");
    }

    user.email_verified = true;
    user.status = "active";
    user.verification_token = null as any;
    user.verification_token_expires = null as any;

    await getRepo(User).save(user);

    try {
      await emailService.sendWelcomeEmail(user.email, user.first_name);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }

    return { message: "Email verified successfully" };
  }

  async login(
    payload: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const user = await getRepo(User).findOne({
      where: { email: payload.email.toLowerCase() },
      relations: { role: true },
    });

    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    if (user.locked_until && user.locked_until > new Date()) {
      const minutesLeft = Math.ceil(
        (user.locked_until.getTime() - Date.now()) / 60000
      );
      throw new HttpError(
        403,
        `Account locked due to multiple failed login attempts. Try again in ${minutesLeft} minutes.`
      );
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.password_hash);

    if (!isPasswordValid) {
      user.failed_login_count = (user.failed_login_count || 0) + 1;

      if (user.failed_login_count >= MAX_FAILED_ATTEMPTS) {
        user.locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await getRepo(User).save(user);

      throw new HttpError(401, "Invalid email or password");
    }

    if (!user.email_verified) {
      throw new HttpError(403, "Please verify your email address before logging in");
    }

    if (user.status !== "active") {
      throw new HttpError(403, "Account is not active");
    }

    user.failed_login_count = 0;
    user.locked_until = null as any;
    await getRepo(User).save(user);

    const accessToken = generateAccessToken({
      userId: user.user_id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role?.name,
    });

    const refreshTokenEntity = getRepo(RefreshToken).create({
      user_id: user.user_id,
      token_hash: "",
      expires_at: getRefreshTokenExpiration(),
      ...(ipAddress && { ip_address: ipAddress }),
      ...(userAgent && { user_agent: userAgent }),
    });

    await getRepo(RefreshToken).save(refreshTokenEntity);

    const refreshToken = generateRefreshToken({
      userId: user.user_id,
      tokenId: refreshTokenEntity.id,
    });

    refreshTokenEntity.token_hash = hashToken(refreshToken);
    await getRepo(RefreshToken).save(refreshTokenEntity);

    return {
      user: await this.getUserProfile(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(token: string, ipAddress?: string, userAgent?: string): Promise<RefreshResponse> {
    let payload;

    try {
      payload = verifyRefreshToken(token);
    } catch (error) {
      throw new HttpError(401, "Invalid or expired refresh token");
    }

    const hashedToken = hashToken(token);
    const tokenRecord = await getRepo(RefreshToken).findOne({
      where: { id: payload.tokenId },
    });

    if (!tokenRecord || tokenRecord.token_hash !== hashedToken) {
      throw new HttpError(401, "Invalid refresh token");
    }

    if (tokenRecord.revoked_at) {
      throw new HttpError(401, "Refresh token has been revoked");
    }

    if (tokenRecord.expires_at < new Date()) {
      throw new HttpError(401, "Refresh token expired");
    }

    const user = await getRepo(User).findOne({
      where: { user_id: payload.userId },
      relations: { role: true },
    });

    if (!user || user.status !== "active") {
      throw new HttpError(401, "User not found or inactive");
    }

    tokenRecord.revoked_at = new Date();

    const newRefreshTokenEntity = getRepo(RefreshToken).create({
      user_id: user.user_id,
      token_hash: "",
      expires_at: getRefreshTokenExpiration(),
      ...(ipAddress && { ip_address: ipAddress }),
      ...(userAgent && { user_agent: userAgent }),
    });

    await getRepo(RefreshToken).save(newRefreshTokenEntity);

    tokenRecord.replaced_by_id = newRefreshTokenEntity.id;
    await getRepo(RefreshToken).save(tokenRecord);

    const newAccessToken = generateAccessToken({
      userId: user.user_id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role?.name,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.user_id,
      tokenId: newRefreshTokenEntity.id,
    });

    newRefreshTokenEntity.token_hash = hashToken(newRefreshToken);
    await getRepo(RefreshToken).save(newRefreshTokenEntity);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string): Promise<{ message: string }> {
    const hashedToken = hashToken(token);

    const tokenRecord = await getRepo(RefreshToken).findOne({
      where: { token_hash: hashedToken },
    });

    if (tokenRecord && !tokenRecord.revoked_at) {
      tokenRecord.revoked_at = new Date();
      await getRepo(RefreshToken).save(tokenRecord);
    }

    return { message: "Logged out successfully" };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await getRepo(User).findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { message: "If the email exists, a reset link has been sent" };
    }

    const resetToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    user.password_reset_token = hashToken(resetToken);
    user.password_reset_expires = tokenExpiry;

    await getRepo(User).save(user);

    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.first_name
      );
    } catch (error) {
      console.error("Failed to send password reset email:", error);
    }

    return { message: "If the email exists, a reset link has been sent" };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const hashedToken = hashToken(token);

    const user = await getRepo(User).findOne({
      where: { password_reset_token: hashedToken },
    });

    if (!user) {
      throw new HttpError(400, "Invalid or expired reset token");
    }

    if (user.password_reset_expires && user.password_reset_expires < new Date()) {
      throw new HttpError(400, "Reset token has expired");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    user.password_hash = passwordHash;
    user.password_reset_token = null as any;
    user.password_reset_expires = null as any;
    user.failed_login_count = 0;
    user.locked_until = null as any;

    await getRepo(User).save(user);

    await getRepo(RefreshToken).update({ user_id: user.user_id }, { revoked_at: new Date() });

    return { message: "Password reset successfully" };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const user = await getRepo(User).findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      throw new HttpError(401, "Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = passwordHash;

    await getRepo(User).save(user);

    await getRepo(RefreshToken).update({ user_id: user.user_id }, { revoked_at: new Date() });

    return { message: "Password changed successfully" };
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await getRepo(User).findOne({
      where: { user_id: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    return this.getUserProfile(user);
  }
}

export const authService = new AuthService();
