export interface TaskDependencyResponse {
  task_id: string;
  depends_on_task_id: string;
  dependency_type: string;
  created_at: Date;
}

export interface CreateTaskDependencyDto {
  task_id: string;
  depends_on_task_id: string;
  dependency_type?: string;
}
