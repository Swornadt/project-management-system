// Mirrors server/src/features/authentication/auth.dto.ts.
export interface ApiUserProfile {
  user_id: string;
  role_id: string;
  role_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  email_verified: boolean;
  created_at: string;
}

export interface ApiLoginDto {
  email: string;
  password: string;
}

export interface ApiAuthResponse {
  user: ApiUserProfile;
  accessToken: string;
  refreshToken: string;
}
