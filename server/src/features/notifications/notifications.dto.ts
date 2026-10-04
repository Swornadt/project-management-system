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
  is_read: boolean | undefined;
  type: string | undefined;
  limit: number | undefined;
  offset: number | undefined;
}