import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type { CreateQuotationInput, UpdateQuotationInput } from "@/contracts/validation";
import type { Quotation } from "@/contracts/types";
import type { QuotationFilterValues } from "../types";
import { QUOTATION_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

export const quotationsService = {
  getQuotations: (params?: QuotationFilterValues) => 
    service.get<Quotation[]>(QUOTATION_ENDPOINTS.LIST, { params }),

  getQuotationStats: () => 
    service.get<{ total: number; pending: number; approved: number; rejected: number }>(QUOTATION_ENDPOINTS.STATS).then(res => res.data),

  getQuotationDetail: (id: string) => 
    service.get<Quotation>(QUOTATION_ENDPOINTS.GET(id)).then(res => res.data),

  createQuotation: (payload: CreateQuotationInput) => 
    service.post<Quotation>(QUOTATION_ENDPOINTS.CREATE, payload).then(res => res.data),

  updateQuotation: (id: string, payload: UpdateQuotationInput) => 
    service.patch<Quotation>(QUOTATION_ENDPOINTS.UPDATE(id), payload).then(res => res.data),

  deleteQuotation: (id: string) => 
    service.delete<void>(QUOTATION_ENDPOINTS.DELETE(id)),
};
