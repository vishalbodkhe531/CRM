export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface Pagination {
  page: number;
  limit: number;
}
