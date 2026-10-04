import axios from "axios";
import type {
  ApiContentResponse,
  ApiCreateContentDto,
  ApiUpdateContentDto,
  ApiDecideApprovalDto,
  ApiProjectResponse,
  ApiProjectListPage,
  ApiProjectDashboard,
  ApiCreateProjectDto,
  ApiUpdateProjectDto,
  ApiProjectMember,
  ApiUserSummary,
  ApiResponse,
} from "./types";

// Relative path — Vite's dev server proxies /api to the backend (see
// vite.config.ts), so this works locally with no env var. In production,
// set VITE_API_BASE_URL and swap the baseURL below to
// import.meta.env.VITE_API_BASE_URL ?? "/api/v1".
export const axiosClient = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Attaches the JWT (set via setAccessToken() on login, or manually via
// localStorage for dev testing before a login screen existed).
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAccessToken(token: string) {
  localStorage.setItem("accessToken", token);
}

export function clearAccessToken() {
  localStorage.removeItem("accessToken");
}

export interface ListParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const projectApi = {
  // GET /projects nests its array under .projects and paginates with
  // page/per_page/total_pages, unlike every other list endpoint in this
  // codebase (bare array in `data`, a sibling `meta` with limit/offset/
  // count). That mismatch — not a typo — was the cause of the earlier
  // "projects.map is not a function" error: the old type annotation here
  // claimed `data` was ApiProjectResponse[] when it was actually
  // { projects, pagination }, so TypeScript had no way to catch it.
  //
  // Translating the response here, once, means every caller (existing and
  // future) can keep using the same `res.data` / `res.meta` pattern as
  // contentApi/taskApi/etc. without needing to know this endpoint is
  // shaped differently under the hood.
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    axiosClient
      .get<ApiResponse<ApiProjectListPage>>("/projects", { params })
      .then((res) => {
        const { projects, pagination } = res.data.data;
        const response: ApiResponse<ApiProjectResponse[]> = {
          success: res.data.success,
          statusCode: res.data.statusCode,
          message: res.data.message,
          data: projects,
          meta: {
            total: pagination.total,
            limit: pagination.per_page,
            offset: (pagination.page - 1) * pagination.per_page,
            count: projects.length,
          },
        };
        return response;
      }),

  // Project + owner + members + progress/task counts in one call.
  dashboard: (id: string) =>
    axiosClient
      .get<ApiResponse<ApiProjectDashboard>>(`/projects/${id}/dashboard`)
      .then((res) => res.data),

  create: (payload: ApiCreateProjectDto) =>
    axiosClient
      .post<ApiResponse<ApiProjectResponse>>("/projects", payload)
      .then((res) => res.data),

  update: (id: string, payload: ApiUpdateProjectDto) =>
    axiosClient
      .patch<ApiResponse<ApiProjectResponse>>(`/projects/${id}`, payload)
      .then((res) => res.data),

  archive: (id: string) =>
    axiosClient
      .patch<ApiResponse<{ message: string; project_id: string; status: string }>>(
        `/projects/${id}/archive`
      )
      .then((res) => res.data),

  addMember: (id: string, userId: string) =>
    axiosClient
      .post<ApiResponse<ApiProjectMember>>(`/projects/${id}/members`, {
        user_id: userId,
        role: "member",
      })
      .then((res) => res.data),

  removeMember: (id: string, userId: string) =>
    axiosClient
      .delete<ApiResponse<{ message: string }>>(`/projects/${id}/members/${userId}`)
      .then((res) => res.data),
};

// GET /users/search is Admin/Manager only; used to name members and pick new ones.
export const userApi = {
  search: (params?: { q?: string; limit?: number }) =>
    axiosClient
      .get<ApiResponse<ApiUserSummary[]>>("/users/search", { params })
      .then((res) => res.data),
};

export const contentApi = {
  list: (params?: ListParams) =>
    axiosClient
      .get<ApiResponse<ApiContentResponse[]>>("/contents", { params })
      .then((res) => res.data),

  getOne: (id: string) =>
    axiosClient
      .get<ApiResponse<ApiContentResponse>>(`/contents/${id}`)
      .then((res) => res.data),

  create: (payload: ApiCreateContentDto) =>
    axiosClient
      .post<ApiResponse<ApiContentResponse>>("/contents", payload)
      .then((res) => res.data),

  update: (id: string, payload: ApiUpdateContentDto) =>
    axiosClient
      .patch<ApiResponse<ApiContentResponse>>(`/contents/${id}`, payload)
      .then((res) => res.data),

  remove: (id: string) =>
    axiosClient
      .delete<ApiResponse<boolean>>(`/contents/${id}`)
      .then((res) => res.data),

  submitForApproval: (id: string) =>
    axiosClient
      .post<ApiResponse<ApiContentResponse>>(`/contents/${id}/submit`)
      .then((res) => res.data),

  decideApproval: (id: string, payload: ApiDecideApprovalDto) =>
    axiosClient
      .post<ApiResponse<ApiContentResponse>>(`/contents/${id}/decide`, payload)
      .then((res) => res.data),

  publish: (id: string) =>
    axiosClient
      .post<ApiResponse<ApiContentResponse>>(`/contents/${id}/publish`)
      .then((res) => res.data),
};

// --- Tasks ---
import type { ApiTaskResponse, ApiCreateTaskDto, ApiUpdateTaskDto } from "./taskTypes";

export const taskApi = {
  listForProject: (projectId: string) =>
    axiosClient
      .get<ApiResponse<ApiTaskResponse[]>>(`/tasks/project/${projectId}`)
      .then((res) => res.data),

  getOne: (id: string) =>
    axiosClient.get<ApiResponse<ApiTaskResponse>>(`/tasks/${id}`).then((res) => res.data),

  create: (payload: ApiCreateTaskDto) =>
    axiosClient.post<ApiResponse<ApiTaskResponse>>("/tasks", payload).then((res) => res.data),

  update: (id: string, payload: ApiUpdateTaskDto) =>
    axiosClient.patch<ApiResponse<ApiTaskResponse>>(`/tasks/${id}`, payload).then((res) => res.data),

  updateStatus: (id: string, status: string) =>
    axiosClient
      .patch<ApiResponse<ApiTaskResponse>>(`/tasks/${id}/status`, { status })
      .then((res) => res.data),

  assign: (id: string, assigneeId: string | null) =>
    axiosClient
      .patch<ApiResponse<ApiTaskResponse>>(`/tasks/${id}/assign`, { assignee_id: assigneeId })
      .then((res) => res.data),

  remove: (id: string) =>
    axiosClient.delete<ApiResponse<boolean>>(`/tasks/${id}`).then((res) => res.data),
};

// --- Auth ---
import type { ApiLoginDto, ApiAuthResponse, ApiUserProfile } from "./authTypes";

export const authApi = {
  login: (payload: ApiLoginDto) =>
    axiosClient.post<ApiResponse<ApiAuthResponse>>("/auth/login", payload).then((res) => res.data),
};

const STORED_USER_KEY = "authUser";

export function setStoredUser(user: ApiUserProfile) {
  localStorage.setItem(STORED_USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): ApiUserProfile | null {
  const raw = localStorage.getItem(STORED_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearStoredUser() {
  localStorage.removeItem(STORED_USER_KEY);
}