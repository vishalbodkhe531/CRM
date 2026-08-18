import type {
  Industry,
  LeadProductPreview,
  LeadSource,
  LeadType,
} from "./lead.types";

export type ProspectStage =
  | "REQUIREMENT"
  | "FOLLOW_UP"
  | "DEMO"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type ProspectStatus = "ACTIVE" | "WON" | "LOST";

export type ProspectFollowUpType =
  | "CALL"
  | "EMAIL"
  | "MEETING"
  | "WHATSAPP"
  | "SITE_VISIT";

export type ProspectReminder = "MINUTES_15" | "MINUTES_30" | "HOUR_1" | "DAY_1";

export type ProspectActivityType =
  | "CONVERSION"
  | "STAGE_CHANGE"
  | "CALL"
  | "MEETING"
  | "EMAIL"
  | "FOLLOW_UP_SET"
  | "QUOTATION_CREATED"
  | "QUOTATION_UPDATED";

export interface ProspectLeadPreview {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string | null;
  gstin?: string | null;
  leadNo?: string | null;
  mobile?: string;
  alternateMobile?: string | null;
  website?: string | null;
  linkedInProfile?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  source?: LeadSource | null;
  industry?: Industry | null;
  leadType?: LeadType | null;
  status?: string | null;
  productInterested?: string | null;
  productInterest?: LeadProductPreview | null;
  requiredDescription?: string | null;
  isActive?: boolean;
}

export interface ProspectAssignee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId?: string | null;
}

export interface ProspectFollowUp {
  date?: string | null;
  time?: string | null;
  type?: ProspectFollowUpType | null;
  notes?: string | null;
  reminder?: ProspectReminder | null;
  assignedToId?: string | null;
  assignedTo?: ProspectAssignee | null;
}

export interface ProspectActivity {
  id: string;
  type: ProspectActivityType;
  title: string;
  summary: string;
  details?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  createdAt: string;
  followUpHealth?: "OK" | "WARNING" | "OVERDUE" | "NONE" | "DONE";
  createdBy?: ProspectAssignee | null;
}

export interface Prospect {
  id: string;
  prospectNo: string;
  leadId: string | null;
  organizationId: string;
  stage: ProspectStage;
  status: ProspectStatus;
  expectedValue?: number | null;
  closeDate?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: ProspectLeadPreview;
  assignedTo?: ProspectAssignee | null;
  followUp?: ProspectFollowUp | null;
  activities?: ProspectActivity[];
  isTerminal: boolean;
  isEditable: boolean;
  followUpHealth?: "OK" | "WARNING" | "OVERDUE" | "NONE" | "DONE";
}

export interface ConvertLeadToProspectResult {
  isNew: boolean;
  prospect: Prospect;
}
