import type { PaginationMeta } from "@/types/api";
import type {
  Organization as OrganizationContract,
  OrganizationCounts as OrganizationCountsContract,
  OrganizationStatus as OrganizationStatusContract,
  OrganizationStatusFilter as OrganizationStatusFilterContract,
  OrganizationType as OrganizationTypeContract,
} from "@/contracts/types";

export type Organization = OrganizationContract;
export type OrganizationCounts = OrganizationCountsContract;
export type OrganizationStatus = OrganizationStatusContract;
export type OrganizationStatusFilter = OrganizationStatusFilterContract;
export type OrganizationType = OrganizationTypeContract;

/**
 * UI-Mapped Model (Shared contract)
 */
export type OrganizationsMeta = PaginationMeta;

export interface OrganizationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrganizationStatusFilter | OrganizationStatusFilter[];
}
