export type OrganizationStatus = "ACTIVE" | "SUSPENDED";

export type OrganizationType = "type1" | "type2";

export interface OrganizationCounts {
  users: number;
  leads: number;
  items: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  prefix: string;
  authorizedPerson: string | null;
  orgType: OrganizationType | null;
  mobile: string | null;
  gstin: string | null;
  address: string | null;
  dateOfRegistration: string | null;
  email: string | null;
  remark: string | null;
  companyLogo: string | null;
  qrCode: string | null;
  signature: string | null;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
  /** Set when the organization has been archived (soft deleted). */
  deletedAt: string | null;
  isArchived: boolean;
  _count?: OrganizationCounts;
}

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  prefix: string;
  status: OrganizationStatus;
}

export interface CreatedOrganizationAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN";
  organizationId: string;
  employeeId: string | null;
}

export interface CreateOrganizationResult {
  organization: Organization;
  adminUser: CreatedOrganizationAdmin;
}
