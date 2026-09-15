export interface UserResponse {
  user_id: string;
  role_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithRoleResponse extends UserResponse {
  role?: {
    role_id: string;
    name: string;
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
  role_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  status?: string;
}
