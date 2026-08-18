export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  missedFollowUps: number;
  followUpsDueToday?: number;
}

export interface ApiResponse<T, TMeta = PaginationMeta> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: TMeta;
}

export interface ApiError {
  success: false;
  status: number;
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}
