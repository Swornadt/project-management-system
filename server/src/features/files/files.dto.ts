export interface FileResponse {
  file_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: Date;
  url: string;
}

export interface UploadFileBody {
  project_id?: string;
  task_id?: string;
  content_id?: string;
}