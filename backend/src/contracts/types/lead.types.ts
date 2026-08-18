export type LeadSource =
  | "COLD_CALL"
  | "EMAIL"
  | "REFERENCE"
  | "SOCIAL_MEDIA"
  | "WEBSITE"
  | "ADVERTISE"
  | "GOOGLE_ADS"
  | "EVENT"
  | "TRADE_SHOW"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "OTHER";

export type Industry =
  | "IT"
  | "BANKING"
  | "BANKING_FINANCE"
  | "EDUCATION"
  | "MANUFACTURING"
  | "HEALTHCARE"
  | "REAL_ESTATE"
  | "RETAIL"
  | "ECOMMERCE"
  | "AUTOMOBILE"
  | "CONSTRUCTION"
  | "TRAVEL_TOURISM"
  | "MEDIA_ENTERTAINMENT"
  | "OTHER";

export type LeadType = "NEW" | "EXISTING";

export type LeadStatus =
  | "NEW"
  | "ATTEMPTED_CONTACT"
  | "CONTACTED"
  | "QUALIFIED"
  | "UNQUALIFIED";

export interface LeadUserPreview {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LeadProductPreview {
  id: string;
  name: string;
  itemCode: string | null;
}

export interface Lead {
  id: string;
  leadNo: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  mobile: string | null;
  alternateMobile?: string | null;
  companyName?: string | null;
  gstin?: string | null;
  email: string | null;
  website?: string | null;
  linkedInProfile?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  source?: LeadSource | null;
  industry?: Industry | null;
  customIndustry?: string | null;
  leadType?: LeadType | null;
  status: LeadStatus;
  productInterested?: string | null;
  productInterest?: LeadProductPreview | null;
  requiredDescription?: string | null;
  assignedToId?: string | null;
  assignedTo?: LeadUserPreview | null;
  convertedAt?: string | null;
  convertedById?: string | null;
  createdAt: string;
  isConverted: boolean;
  isActive?: boolean;
}
