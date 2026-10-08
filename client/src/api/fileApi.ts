import { axiosClient } from "./axiosClient";
import type { ApiResponse } from "./types";

// Mirrors server/src/features/files/files.dto.ts (FileResponse).
export interface ApiFile {
  file_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
  url: string;
}

export type FileScope = "project" | "task";

export const fileApi = {
  list: (scope: FileScope, id: string) =>
    axiosClient
      .get<ApiResponse<ApiFile[]>>(`/files/${scope}/${id}`)
      .then((res) => res.data),

  // The backend takes exactly one parent id alongside the file.
  upload: (scope: FileScope, id: string, file: File) => {
    const form = new FormData();
    form.append(scope === "project" ? "project_id" : "task_id", id);
    form.append("file", file); // append after the ids so multer sees the fields
    return axiosClient
      .post<ApiResponse<ApiFile>>("/files/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data);
  },

  remove: (fileId: string) =>
    axiosClient.delete<ApiResponse<boolean>>(`/files/${fileId}`).then((res) => res.data),

  // /raw needs the Bearer token, so a plain <a href> would 401. Fetch the
  // bytes through axios instead and hand the browser a temporary blob URL.
  fetchBlob: (fileId: string, download = false) =>
    axiosClient
      .get<Blob>(`/files/${fileId}/raw`, {
        params: download ? { download: 1 } : undefined,
        responseType: "blob",
      })
      .then((res) => res.data),
};
