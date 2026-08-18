import type { PaginationMeta } from "@/types/api";
import { 
  User, 
  UserRole, 
  UserStatus 
} from "@/contracts/types";

export type { User, UserRole, UserStatus };

export type UsersMeta = PaginationMeta;

/**
 * Response of a super-admin password reset. `temporaryPassword` is shown once
 * and cannot be retrieved again — do not persist or cache it.
 */
export interface ResetPasswordResult {
  user: User;
  temporaryPassword: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | UserRole[];
  organizationId?: string;
  status?: UserStatus | UserStatus[];
}
