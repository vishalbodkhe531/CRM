import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import { normalizeOptionalFields } from "@/utils/normalization.utils";
import type { Prospect } from "@/contracts/types";
import type {
  CreateProspectActivityInput,
  UpdateProspectFollowUpInput,
  UpdateProspectInput,
  UpdateProspectStageInput,
} from "@/contracts/validation";
import type { ProspectFilterValues } from "../types";
import type { ProspectActivity } from "../types";
import { PROSPECT_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

const OPTIONAL_UPDATE_FIELDS: (keyof UpdateProspectInput)[] = [
  "expectedValue",
  "notes",
  "assignedToId",
];

export const prospectsService = {
  getProspects: (params?: ProspectFilterValues) =>
    service.get<Prospect[]>(PROSPECT_ENDPOINTS.LIST, { params }),

  getProspectDetails: (id: string) => 
    service.get<Prospect>(PROSPECT_ENDPOINTS.GET(id)).then(res => res.data),

  updateProspect: (id: string, data: UpdateProspectInput) =>
    service
      .patch<Prospect>(
        PROSPECT_ENDPOINTS.UPDATE(id),
        normalizeOptionalFields(data, OPTIONAL_UPDATE_FIELDS),
      )
      .then(res => res.data),

  updateStage: (id: string, data: UpdateProspectStageInput) =>
    service
      .patch<Prospect>(PROSPECT_ENDPOINTS.UPDATE_STAGE(id), data)
      .then(res => res.data),

  updateFollowUp: (id: string, data: UpdateProspectFollowUpInput) =>
    service
      .patch<Prospect>(
        PROSPECT_ENDPOINTS.UPDATE_FOLLOW_UP(id),
        normalizeOptionalFields(data, [
          "date",
          "time",
          "type",
          "notes",
          "reminder",
          "assignedToId",
        ]),
      )
      .then(res => res.data),

  createActivity: (id: string, data: CreateProspectActivityInput) =>
    service
      .post<ProspectActivity>(PROSPECT_ENDPOINTS.CREATE_ACTIVITY(id), data)
      .then(res => res.data),

  deleteProspect: (id: string) =>
    service.delete<void>(PROSPECT_ENDPOINTS.DELETE(id)).then(res => res.data),
};
