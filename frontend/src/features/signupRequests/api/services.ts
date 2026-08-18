import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type {
  SignupRequest,
  SignupRequestListParams,
  SignupRequestStatusPayload,
} from "../types";
import { SIGNUP_REQUEST_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

export const signupRequestsService = {
  getSignupRequests: (params?: SignupRequestListParams) =>
    service.get<SignupRequest[]>(SIGNUP_REQUEST_ENDPOINTS.LIST, { params }),

  getSignupRequestDetail: (id: string) =>
    service
      .get<SignupRequest>(SIGNUP_REQUEST_ENDPOINTS.DETAIL(id))
      .then((res) => res.data),

  updateSignupRequestStatus: (
    id: string,
    payload: SignupRequestStatusPayload,
  ) =>
    service
      .patch<SignupRequest>(SIGNUP_REQUEST_ENDPOINTS.UPDATE_STATUS(id), payload)
      .then((res) => res.data),
};
