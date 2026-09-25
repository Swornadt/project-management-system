export interface NotificationResponse {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  is_read: boolean;
  created_at: Date;
}

export interface NotificationQueryDto {
  is_read?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}
