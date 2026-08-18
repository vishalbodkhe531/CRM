import type { PaginationMeta } from "@/types/api";

export type QuotationStatus = "APPROVED" | "PENDING" | "REJECTED";
export type QuotationGstCategory = "GST" | "IGST" | "EXEMPTED";

export interface QuotationLineItem {
  id?: string;
  itemId: string;
  itemName: string;
  code: string; // HSN/SAC
  quantity: number;
  unit: string;
  price: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  amount: number;
}

export interface QuotationDetails {
  partyAddress: string;
  partyPostalCode: string;
  stateOfSupply: string;
  refNoSuffix: string;
  items: QuotationLineItem[];
  subtotal: number;
  taxTotal: number;
  tdsPercent: number;
  tdsAmount: number;
  roundOff: number;
  grandTotal: number;
  description?: string;
  termsAndConditions?: string | string[];
  gstCategory: string;
  images?: { name: string; data: string; size?: string }[];
  documents?: { name: string; data: string; size?: string }[];
}

export interface Quotation {
  id: string;
  quotationNo: string;
  partyName: string;
  contactPerson: string;
  refNo: string;
  date: string; // ISO format: 'YYYY-MM-DD'
  status: QuotationStatus;
  assignedToId: string | null;
  prospectId?: string | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  organization?: {
    id: string;
    name: string;
    prefix: string;
    address?: string | null;
    gstin?: string | null;
    mobile?: string | null;
    email?: string | null;
    companyLogo?: string | null;
    qrCode?: string | null;
    signature?: string | null;
  };
  createdAt: string;
  details?: QuotationDetails | null;
}

export interface QuotationFormValues {
  partyName: string;
  contactPerson: string;
  refNo: string;
  date: string;
  status: QuotationStatus;
  assignedToId?: string | null;
  prospectId?: string | null;
  details: QuotationDetails;
}

export interface QuotationFilterValues {
  status?: QuotationStatus | QuotationStatus[];
  assignedToId?: string | string[];
  createdFrom?: string;
  createdTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface QuotationsListResult {
  data: Quotation[];
  meta: PaginationMeta & {
    missedFollowUps?: number; // kept for list layout compatibility
  };
}
