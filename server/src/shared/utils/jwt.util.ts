import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface AccessTokenPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET not configured");
  }

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET not configured");
  }

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET not configured");
  }

  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET not configured");
  }

  return jwt.verify(token, secret) as RefreshTokenPayload;
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiration(): Date {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match || !match[1] || !match[2]) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const multiplier = multipliers[unit];
  if (!multiplier) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  return new Date(Date.now() + value * multiplier);
}
