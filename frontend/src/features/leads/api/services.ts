import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import { normalizeOptionalFields } from "@/utils/normalization.utils";
import type { LeadFilterValues, UserPreview } from "../types";
import type { Lead, LeadStatus } from "@/contracts/types";
import type { Prospect } from "@/contracts/types";
import type { ApiResponse } from "@/types/api";
import type {
  ConvertLeadToProspectInput,
  CreateLeadInput,
  UpdateLeadInput,
} from "@/contracts/validation";
import { LEAD_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

const OPTIONAL_FIELDS: (keyof (CreateLeadInput & UpdateLeadInput))[] = [
  "profilePicture", "companyName", "alternateMobile", "website", "linkedInProfile",
  "address", "city", "state", "pinCode", "industry", "productInterested",
  "assignedToId", "requiredDescription",
];

type ConvertLeadPayload = Partial<Omit<ConvertLeadToProspectInput, "leadId">>;
type LeadStatusMeta = {
  prospect?: {
    id: string;
    prospectNo: string;
    isNew: boolean;
  };
};

// No mapper here anymore.

export const leadsService = {
  getLeads: (params?: LeadFilterValues) =>
    service.get<Lead[]>(LEAD_ENDPOINTS.LIST, { params }),

  getAssignableUsers: () => 
    service.get<UserPreview[]>(LEAD_ENDPOINTS.ASSIGNABLE_USERS).then(res => res.data),
  
  getLeadDetails: (id: string) =>
    service.get<Lead>(LEAD_ENDPOINTS.GET(id)).then(res => res.data),

  createLead: (data: CreateLeadInput | FormData) => {
    if (data instanceof FormData) {
      return service.post<Lead>(LEAD_ENDPOINTS.CREATE, data, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then(res => res.data);
    }
    const payload = normalizeOptionalFields(data, OPTIONAL_FIELDS);
    return service.post<Lead>(LEAD_ENDPOINTS.CREATE, payload).then(res => res.data);
  },

  updateLead: (id: string, data: UpdateLeadInput | FormData) => {
    if (data instanceof FormData) {
      return service.patch<Lead>(LEAD_ENDPOINTS.UPDATE(id), data, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then(res => res.data);
    }
    const payload = normalizeOptionalFields(data, OPTIONAL_FIELDS);
    return service.patch<Lead>(LEAD_ENDPOINTS.UPDATE(id), payload).then(res => res.data);
  },

  deleteLead: (id: string) => 
    service.delete<void>(LEAD_ENDPOINTS.DELETE(id)),

  updateLeadStatus: (id: string, status: LeadStatus) =>
    api
      .patch<ApiResponse<Lead, LeadStatusMeta>>(LEAD_ENDPOINTS.UPDATE_STATUS(id), { status })
      .then(res => res.data),

  assignLead: (id: string, executiveId: string) =>
    service.patch<Lead>(LEAD_ENDPOINTS.ASSIGN(id), { executiveId }).then(res => res.data),

  convertLead: (id: string, data: ConvertLeadPayload = {}) =>
    service.post<Prospect>(LEAD_ENDPOINTS.CONVERT(id), data).then(res => res.data),

  importLeads: (formData: FormData) => 
    service.post<{ count: number }>(LEAD_ENDPOINTS.IMPORT, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(res => res.data),
};
