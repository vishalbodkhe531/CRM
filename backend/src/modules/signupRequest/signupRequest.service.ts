import { SignupRequestStatus } from "@prisma/client";
import { AppError } from "../../utils/errors/appError";
import type { SignupRequestInput } from "../../contracts/validation";
import { signupRequestRepository } from "./signupRequest.repository";

const SIGNUP_REQUEST_SUCCESS_MESSAGE =
  "Thank you for registering. Our team will contact you after reviewing your request.";

const SIGNUP_REQUEST_STATUS_VALUES = [
  SignupRequestStatus.CONTACTED,
  SignupRequestStatus.APPROVED,
  SignupRequestStatus.REJECTED,
] as const;

export interface SignupRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SignupRequestStatus | SignupRequestStatus[];
}

const mapSignupRequest = (request: any) => ({
  ...request,
  reviewedAt: request.reviewedAt?.toISOString() ?? null,
  createdAt: request.createdAt.toISOString(),
  updatedAt: request.updatedAt.toISOString(),
});

export const signupRequestService = {
  successMessage: SIGNUP_REQUEST_SUCCESS_MESSAGE,

  createRequest: async (
    data: SignupRequestInput,
    tracking: { ipAddress?: string; userAgent?: string },
  ) => {
    const email = data.email.trim().toLowerCase();
    const existingRequest = await signupRequestRepository.findByEmail(email);
    const existingUser = await signupRequestRepository.findActiveUserByEmail(email);

    if (!existingRequest && !existingUser) {
      await signupRequestRepository.create({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        phone: data.phone?.trim() || null,
        companyName: data.companyName.trim(),
        ipAddress: tracking.ipAddress,
        userAgent: tracking.userAgent,
      });
    }

    return { message: SIGNUP_REQUEST_SUCCESS_MESSAGE };
  },

  listRequests: async (params: SignupRequestListParams) => {
    const result = await signupRequestRepository.findAll({
      pageNum: params.page,
      limitNum: params.limit,
      search: params.search,
      status: params.status,
    });

    return {
      data: result.data.map(mapSignupRequest),
      meta: result.meta,
    };
  },

  getRequest: async (id: string) => {
    const request = await signupRequestRepository.findById(id);
    if (!request) {
      throw AppError.resource.notFound("Signup request");
    }

    return mapSignupRequest(request);
  },

  updateStatus: async (
    id: string,
    status: SignupRequestStatus,
    adminUserId: string,
    adminNotes?: string | null,
  ) => {
    if (!SIGNUP_REQUEST_STATUS_VALUES.includes(status as any)) {
      throw AppError.validation.badRequest(
        "Status must be CONTACTED, APPROVED, or REJECTED",
      );
    }

    const existing = await signupRequestRepository.findById(id);
    if (!existing) {
      throw AppError.resource.notFound("Signup request");
    }

    const updated = await signupRequestRepository.updateStatus(id, {
      status,
      adminNotes: adminNotes?.trim() || null,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
    });

    return mapSignupRequest(updated);
  },
};
