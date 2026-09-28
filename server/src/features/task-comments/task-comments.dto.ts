export interface TaskCommentResponse {
  comment_id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskCommentDto {
  task_id: string;
  user_id: string; // set by the controller from the auth token, not sent by the client
  comment: string;
}

export interface UpdateTaskCommentDto {
  comment: string;
}
