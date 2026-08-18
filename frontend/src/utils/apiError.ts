import axios from 'axios';
import type { ApiError } from '@/types/api';

export const extractApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    return {
      success: false,
      status: data?.code ?? error.response?.status ?? 500,
      message: data?.error ?? error.message ?? "An unexpected error occurred",
      code: data?.errorCode,
      details: data?.details,
    };
  }
  return {
    success: false,
    status: 500,
    message: "An unexpected error occurred",
  };
};
