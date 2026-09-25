// Mirrors server/src/features/tasks/tasks.dto.ts exactly.
export type TaskStatus =
  | "backlog" | "todo" | "in_progress" | "in_review" | "blocked" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ApiTaskResponse {
  task_id: string;
  project_id: string;
  assignee_id?: string;
  created_by: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  estimate_hours?: number;
  labels: string[];
  parent_task_id?: string;
  created_at: string;
  updated_at: string;
  is_overdue?: boolean;
}

export interface ApiCreateTaskDto {
  project_id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: string;
  estimate_hours?: number;
  labels?: string[];
  parent_task_id?: string;
}

export interface ApiUpdateTaskDto {
  title?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  estimate_hours?: number;
  labels?: string[];
  parent_task_id?: string;
}
