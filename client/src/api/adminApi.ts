import { axiosClient } from "./axiosClient";

export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    recentlyCreated: number;
  };
  projects: {
    total: number;
    active: number;
    recentlyCreated: number;
    byStatus: Record<string, number>;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    byStatus: Record<string, number>;
  };
  content: {
    total: number;
    published: number;
    draft: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
}

export const adminApi = {
  getDashboardStats: () =>
    axiosClient
      .get<ApiResponse<AdminDashboardStats>>("/admin/dashboard/stats")
      .then((res) => res.data),
};
