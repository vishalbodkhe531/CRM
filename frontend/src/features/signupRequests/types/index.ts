export type SignupRequestStatus =
  | "PENDING"
  | "CONTACTED"
  | "APPROVED"
  | "REJECTED";

export interface SignupRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  companyName: string;
  status: SignupRequestStatus;
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignupRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SignupRequestStatus | SignupRequestStatus[];
}

export interface SignupRequestStatusPayload {
  status: Exclude<SignupRequestStatus, "PENDING">;
  adminNotes?: string | null;
}
