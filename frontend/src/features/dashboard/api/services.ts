import api from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type { DashboardStats } from "../types";

export const dashboardService = {
  getStats: async (endpoint: string) => {
    const res = await api.get<ApiResponse<DashboardStats>>(endpoint);
    return res.data.data;
  },
};
