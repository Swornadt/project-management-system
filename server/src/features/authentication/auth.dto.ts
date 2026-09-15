export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role_id?: string;
}

export interface AuthResponse {
  user: {
    user_id: string;
    role_id: string;
    role_name?: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
  };
  token: string;
}

export interface MeResponse {
  user: {
    user_id: string;
    role_id: string;
    role_name?: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
  };
}
