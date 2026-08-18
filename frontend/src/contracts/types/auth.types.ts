export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  mobile?: string | null;
  profileImage?: string | null;
  status: string;
  employeeId?: string | null;
  designation?: string | null;
  joiningDate?: string | null;
  organizationId?: string | null;
  managerId?: string | null;
  organization?: {
    name: string;
    slug: string;
    prefix: string;
    status: string;
    address?: string | null;
    gstin?: string | null;
    mobile?: string | null;
    email?: string | null;
    companyLogo?: string | null;
    qrCode?: string | null;
    signature?: string | null;
  } | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface SignupResponse {
  user: AuthUser;
  accessToken: string;
}

export interface SignupRequestResponse {
  message: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface CurrentUserResponse {
  user: AuthUser | null;
}

export interface UpdateProfileResponse {
  user: AuthUser;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}
