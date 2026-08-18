import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type {
  CreateOrganizationResult,
  Organization,
  PublicOrganization,
  OrganizationStatus,
} from "@/contracts/types";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "@/contracts/validation";
import type { 
  OrganizationListParams, 
} from "../types";
import { ORGANIZATION_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

// export const ORGANIZATION_ENDPOINTS = {
//   LIST: "/organizations",
//   CREATE: "/organizations",
//   DETAIL: (id: string) => `/organizations/${id}`,
//   UPDATE_STATUS: (id: string) => `/organizations/${id}/status`,
// };

const multipartConfig = {
  headers: { "Content-Type": "multipart/form-data" },
};

export const organizationsService = {
  getOrganizations: (params?: OrganizationListParams) => 
    service.get<Organization[]>(ORGANIZATION_ENDPOINTS.LIST, { params }),

  getOrganizationDetail: (id: string) => 
    service.get<Organization>(ORGANIZATION_ENDPOINTS.DETAIL(id)).then(res => res.data),

  getOrganizationBySlug: (slug: string) =>
    service.get<PublicOrganization>(ORGANIZATION_ENDPOINTS.BY_SLUG(slug)).then(res => res.data),

  updateOrganization: (id: string, payload: UpdateOrganizationInput | FormData) => 
    service.patch<Organization>(
      ORGANIZATION_ENDPOINTS.DETAIL(id),
      payload,
      payload instanceof FormData ? multipartConfig : undefined,
    ).then(res => res.data),

  archiveOrganization: (id: string) =>
    service
      .delete<Organization>(ORGANIZATION_ENDPOINTS.ARCHIVE(id))
      .then((res) => res.data),

  restoreOrganization: (id: string) =>
    service
      .patch<Organization>(ORGANIZATION_ENDPOINTS.RESTORE(id))
      .then((res) => res.data),

  updateOrganizationStatus: (id: string, status: OrganizationStatus) =>
    service.patch<Organization>(ORGANIZATION_ENDPOINTS.UPDATE_STATUS(id), { status }).then(res => res.data),

  createOrganization: (payload: CreateOrganizationInput | FormData) => 
    service.post<CreateOrganizationResult>(
      ORGANIZATION_ENDPOINTS.CREATE,
      payload,
      payload instanceof FormData ? multipartConfig : undefined,
    ).then(res => res.data),
};
