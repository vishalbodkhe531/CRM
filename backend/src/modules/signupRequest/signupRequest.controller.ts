import { Request, Response } from "express";
import { SignupRequestStatus } from "@prisma/client";
import { ApiResponse } from "../../utils/response/response";
import { AppError } from "../../utils/errors/appError";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import {
  SignupRequestListSchema,
  SignupRequestStatusUpdateSchema,
} from "../../contracts/validation/signupRequest.schemas";
import { signupRequestService } from "./signupRequest.service";

const submitSignupRequest = asyncHandler(async (req: Request, res: Response) => {
  const result = await signupRequestService.createRequest(req.body, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return ApiResponse.created(res, result, result.message);
});

const listSignupRequests = asyncHandler(async (req: Request, res: Response) => {
  const query = SignupRequestListSchema.parse(req.query);
  const result = await signupRequestService.listRequests(query);

  return ApiResponse.ok(
    res,
    result.data,
    "Signup requests retrieved",
    result.meta,
  );
});

const getSignupRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || typeof id !== "string") {
    throw AppError.validation.badRequest("Valid signup request ID is required");
  }

  const request = await signupRequestService.getRequest(id);
  return ApiResponse.ok(res, request, "Signup request retrieved");
});

const updateSignupRequestStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Valid signup request ID is required");
    }

    if (!req.user) {
      throw AppError.authentication.required();
    }

    const { status, adminNotes } = SignupRequestStatusUpdateSchema.parse(req.body);
    const request = await signupRequestService.updateStatus(
      id,
      status as SignupRequestStatus,
      req.user.id,
      adminNotes,
    );

    return ApiResponse.ok(res, request, "Signup request status updated");
  },
);

export const signupRequestController = {
  submitSignupRequest,
  listSignupRequests,
  getSignupRequest,
  updateSignupRequestStatus,
};
