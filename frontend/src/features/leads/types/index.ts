import type { PaginationMeta } from "@/types/api";
import type {
  Industry as IndustryContract,
  Lead as LeadContract,
  LeadProductPreview,
  LeadSource as LeadSourceContract,
  LeadStatus as LeadStatusContract,
  LeadType as LeadTypeContract,
  LeadUserPreview,
} from "@/contracts/types";

export type LeadSource = LeadSourceContract;
export type Industry = IndustryContract;
export type LeadStatus = LeadStatusContract;
export type LeadType = LeadTypeContract;
export type Lead = LeadContract;
export type UserPreview = LeadUserPreview;
export type ItemPreview = LeadProductPreview;

/**
 * UI-Mapped Model (Shared contract)
 */
export interface LeadImportSummary {
  count: number;
}

export interface LeadStats {
  total: number;
  assigned: number;
  unassigned: number;
  byStatus: Partial<Record<LeadStatus, number>>;
}

export type LeadFilterValues = {
  status?: LeadStatus | LeadStatus[];
  source?: LeadSource | LeadSource[];
  industry?: Industry | Industry[];
  productInterested?: string | string[];
  assignedToId?: string | string[];
  search?: string;
  page?: number;
  limit?: number;
};

export type LeadsMeta = PaginationMeta;
