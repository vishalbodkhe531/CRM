import type { AxiosInstance, AxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types/api";

/**
 * Utility to create standard API service methods with less boilerplate.
 */
export const createApiService = (api: AxiosInstance) => ({
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    api.get<ApiResponse<T>>(url, config).then(res => res.data),
    
  post: <T, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ) => 
    api.post<ApiResponse<T>>(url, data, config).then(res => res.data),
    
  put: <T, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ) => 
    api.put<ApiResponse<T>>(url, data, config).then(res => res.data),
    
  patch: <T, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ) => 
    api.patch<ApiResponse<T>>(url, data, config).then(res => res.data),
    
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    api.delete<ApiResponse<T>>(url, config).then(res => res.data),
});
