import api from "@/lib/api/client";
import { AUTH_ENDPOINTS } from "./endpoints";
import type { ApiResponse } from "@/types/api";
import { 
  LoginInput, 
  SignupRequestInput,
  SignupInput,
  UpdateProfileInput, 
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/contracts/validation";
import {
  LoginResponse,
  SignupRequestResponse,
  SignupResponse,
  CurrentUserResponse,
  RefreshResponse,
  UpdateProfileResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from "@/contracts/types";

export const authService = {
  fetchMe: async () => {
    const res = await api.get<ApiResponse<CurrentUserResponse>>(AUTH_ENDPOINTS.ME);
    return res.data.data;
  },

  signup: async (payload: SignupInput): Promise<SignupResponse> => {
    const res = await api.post<ApiResponse<SignupResponse>>(
      AUTH_ENDPOINTS.SIGNUP,
      payload,
    );
    return res.data.data;
  },

  submitSignupRequest: async (
    payload: SignupRequestInput,
  ): Promise<SignupRequestResponse> => {
    const res = await api.post<ApiResponse<SignupRequestResponse>>(
      AUTH_ENDPOINTS.SIGNUP_REQUEST,
      payload,
    );
    return res.data.data;
  },

  login: async (payload: LoginInput): Promise<LoginResponse> => {
    const res = await api.post<ApiResponse<LoginResponse>>(
      AUTH_ENDPOINTS.LOGIN,
      payload,
    );
    return res.data.data;
  },

  refreshSession: async (): Promise<RefreshResponse> => {
    const res = await api.post<ApiResponse<RefreshResponse>>(
      AUTH_ENDPOINTS.REFRESH_TOKEN,
      {},
    );
    return res.data.data;
  },

  updateProfile: async (payload: UpdateProfileInput | FormData): Promise<UpdateProfileResponse> => {
    const res = await api.patch<ApiResponse<UpdateProfileResponse>>(
      AUTH_ENDPOINTS.PROFILE,
      payload,
      payload instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    );
    return res.data.data;
  },

  changePassword: async (payload: ChangePasswordInput) => {
    const res = await api.post<ApiResponse<void>>(AUTH_ENDPOINTS.CHANGE_PASSWORD, payload);
    return res.data;
  },

  generatePasswordResetOtp: async (
    payload: ForgotPasswordInput,
  ): Promise<ForgotPasswordResponse> => {
    const res = await api.post<ApiResponse<ForgotPasswordResponse>>(
      AUTH_ENDPOINTS.FORGOT_PASSWORD_GENERATE_OTP,
      payload,
    );
    return res.data.data;
  },

  resetPasswordWithOtp: async (
    payload: ResetPasswordInput,
  ): Promise<ResetPasswordResponse> => {
    const res = await api.post<ApiResponse<ResetPasswordResponse>>(
      AUTH_ENDPOINTS.FORGOT_PASSWORD_RESET,
      payload,
    );
    return res.data.data;
  },

  logout: async () => {
    const res = await api.post<ApiResponse<void>>(AUTH_ENDPOINTS.LOGOUT);
    return res.data;
  },
};
