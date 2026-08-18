export type QuotationStatus = "APPROVED" | "PENDING" | "REJECTED";

export interface QuotationLineItem {
  id?: string;
  itemId: string;
  itemName: string;
  code: string;
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
  date: string;
  status: QuotationStatus;
  assignedToId: string | null;
  prospectId?: string | null;
  version: number;
  currency: string;
  subtotal: number;
  taxTotal: number;
  tdsAmount: number;
  roundOff: number;
  grandTotal: number;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  details?: QuotationDetails | null;
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
  statusHistory?: {
    id: string;
    fromStatus: QuotationStatus | null;
    toStatus: QuotationStatus;
    reason?: string | null;
    changedAt: string;
    changedBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }[];
}
