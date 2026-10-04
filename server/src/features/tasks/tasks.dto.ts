export interface TaskResponse {
  task_id: string;
  project_id: string;
  assignee_id?: string;
  created_by: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: Date;
  estimate_hours?: number;
  labels: string[];
  parent_task_id?: string;
  created_at: Date;
  updated_at: Date;
  is_overdue?: boolean;
}

export interface CreateTaskDto {
  project_id: string;
  created_by: string; // set by the controller from the auth token, not sent by the client
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: Date;
  estimate_hours?: number;
  labels?: string[];
  parent_task_id?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: string;
  due_date?: Date;
  estimate_hours?: number;
  labels?: string[];
  parent_task_id?: string;
}

export interface UpdateTaskStatusDto {
  status: string;
}

export interface AssignTaskDto {
  assignee_id: string | null;
}

export interface TaskFilterDto {
  status?: string;
  priority?: string;
  assignee_id?: string;
  label?: string;
  overdue?: boolean;
}
