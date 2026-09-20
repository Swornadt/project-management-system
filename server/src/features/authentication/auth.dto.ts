export interface RegisterDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role_id?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface UserProfile {
  user_id: string;
  role_id: string;
  role_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  email_verified: boolean;
  created_at: Date;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: UserProfile;
}
