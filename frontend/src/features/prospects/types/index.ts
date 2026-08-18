import type { PaginationMeta } from "@/types/api";
import type {
  Prospect as ProspectContract,
  ProspectActivity as ProspectActivityContract,
  ProspectActivityType as ProspectActivityTypeContract,
  ProspectAssignee as ProspectAssigneeContract,
  ProspectFollowUp as ProspectFollowUpContract,
  ProspectFollowUpType as ProspectFollowUpTypeContract,
  ProspectLeadPreview as ProspectLeadPreviewContract,
  ProspectReminder as ProspectReminderContract,
  ProspectStage as ProspectStageContract,
  ProspectStatus as ProspectStatusContract,
} from "@/contracts/types";

export type ProspectStage = ProspectStageContract;
export type ProspectStatus = ProspectStatusContract;
export type ProspectFollowUpType = ProspectFollowUpTypeContract;
export type ProspectReminder = ProspectReminderContract;
export type ProspectActivityType = ProspectActivityTypeContract;
export type ProspectLeadPreview = ProspectLeadPreviewContract;
export type ProspectAssignee = ProspectAssigneeContract;
export type ProspectFollowUp = ProspectFollowUpContract;
export type ProspectActivity = ProspectActivityContract;
export type Prospect = ProspectContract;

export interface ProspectFormValues {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  companyName: string;
  expectedValue: string;
  assignedToId: string;
  notes: string;
}

export type ProspectFilterValues = {
  stage?: ProspectStage | ProspectStage[];
  assignedToId?: string | string[];
  createdFrom?: string;
  createdTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  status?: string | string[];
};

export interface ProspectsListResult {
  data: Prospect[];
  meta: PaginationMeta;
}
