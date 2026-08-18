export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EXECUTIVE";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  mobile?: string | null;
  profileImage?: string | null;
  employeeId?: string | null;
  designation?: string | null;
  joiningDate?: string | null; // ISO string format favored for API returning
  role: UserRole;
  status: UserStatus;
  organizationId?: string | null;
  managerId?: string | null;
  organization?: {
    prefix: string;
    status: string;
  } | null;
  lastLoginAt?: string | null;
  deletedAt?: string | null;
  deletedById?: string | null;
  createdAt: string;
  updatedAt: string;
}
