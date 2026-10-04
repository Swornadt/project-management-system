export interface UserResponse {
  user_id: string;
  role_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithRoleResponse extends UserResponse {
  role?: {
    role_id: string;
    name: string;
    description: string;
  };
}

export interface CreateUserDto {
  role_id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  status?: string;
}

export interface UpdateUserDto {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
}

export interface UpdateProfileDto {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ChangeRoleDto {
  role_id: string;
}

export interface UpdateStatusDto {
  status: 'active' | 'inactive' | 'suspended';
}

export interface SearchUsersDto {
  q?: string;
  role?: string;
  status?: string;
  email_verified?: boolean;
}

export interface UserStatsResponse {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  verified: number;
  unverified: number;
  locked: number;
  byRole: Record<string, number>;
  recentlyCreated: number;
}
