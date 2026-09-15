export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role_id?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  user_id: string;
  role_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}
