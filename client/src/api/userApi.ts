import { axiosClient } from "./axiosClient";

export interface UserResponse {
  user_id: string;
  role_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  role?: {
    role_id: string;
    name: string;
    description: string;
  };
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

export interface SearchParams {
  q?: string;
  role?: string;
  status?: string;
  email_verified?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
  meta?: {
    total: number;
    limit: number;
    offset: number;
    count: number;
  };
}

export const userApi = {
  getAll: (params?: SearchParams) =>
    axiosClient
      .get<ApiResponse<UserResponse[]>>("/users", { params })
      .then((res) => res.data),

  search: (params?: SearchParams) =>
    axiosClient
      .get<ApiResponse<UserResponse[]>>("/users/search", { params })
      .then((res) => res.data),

  getStats: () =>
    axiosClient
      .get<ApiResponse<UserStatsResponse>>("/users/stats")
      .then((res) => res.data),

  getOne: (id: string) =>
    axiosClient
      .get<ApiResponse<UserResponse>>(`/users/${id}`)
      .then((res) => res.data),

  create: (payload: CreateUserDto) =>
    axiosClient
      .post<ApiResponse<UserResponse>>("/users", payload)
      .then((res) => res.data),

  update: (id: string, payload: UpdateUserDto) =>
    axiosClient
      .patch<ApiResponse<UserResponse>>(`/users/${id}`, payload)
      .then((res) => res.data),

  changeRole: (id: string, role_id: string) =>
    axiosClient
      .patch<ApiResponse<UserResponse>>(`/users/${id}/role`, { role_id })
      .then((res) => res.data),

  updateStatus: (id: string, status: string) =>
    axiosClient
      .patch<ApiResponse<UserResponse>>(`/users/${id}/status`, { status })
      .then((res) => res.data),

  activate: (id: string) =>
    axiosClient
      .patch<ApiResponse<UserResponse>>(`/users/${id}/activate`)
      .then((res) => res.data),

  deactivate: (id: string) =>
    axiosClient
      .patch<ApiResponse<UserResponse>>(`/users/${id}/deactivate`)
      .then((res) => res.data),

  delete: (id: string) =>
    axiosClient
      .delete<ApiResponse<{ deleted: boolean }>>(`/users/${id}`)
      .then((res) => res.data),

  restore: (id: string) =>
    axiosClient
      .patch<ApiResponse<UserResponse>>(`/users/${id}/restore`)
      .then((res) => res.data),
};
