export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    count?: number;
  };
}

export interface PaginationParams {
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface SortParams {
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export interface FilterParams {
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  count: number;
}

export type IdDto = { id: string };

export interface SuccessResponse {
  success: true;
}
