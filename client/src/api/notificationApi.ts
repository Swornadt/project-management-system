import { axiosClient } from "./axiosClient";
import type { ApiResponse } from "./types";

// Mirrors server/src/features/notifications/notifications.dto.ts.
export interface ApiNotification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string | null;
  is_read: boolean;
  created_at: string;
}

export const notificationApi = {
  // Backend sorts unread first, then newest.
  list: (params?: { limit?: number; offset?: number; is_read?: boolean }) =>
    axiosClient
      .get<ApiResponse<ApiNotification[]>>("/notifications", { params })
      .then((res) => res.data),

  unreadCount: () =>
    axiosClient
      .get<ApiResponse<{ unread_count: number }>>("/notifications/unread-count")
      .then((res) => res.data.data.unread_count),

  markRead: (id: string) =>
    axiosClient
      .patch<ApiResponse<ApiNotification>>(`/notifications/${id}/read`)
      .then((res) => res.data),

  markAllRead: () =>
    axiosClient
      .patch<ApiResponse<{ updated: number }>>("/notifications/read-all")
      .then((res) => res.data),
};
