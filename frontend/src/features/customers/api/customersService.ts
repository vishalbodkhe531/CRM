import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type { Prospect } from "@/contracts/types";
import type { ProspectFilterValues } from "@/features/prospects/types";

const service = createApiService(api);

export const customersService = {
  getCustomers: (params?: ProspectFilterValues) =>
    service.get<Prospect[]>("/prospects", { params }),

  getCustomerStats: () =>
    service.get<{ total: number; active: number; inactive: number }>("/prospects/customer-stats").then(res => res.data),
};
