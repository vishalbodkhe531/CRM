import { z } from "zod";

const QuotationStatusEnum = z.enum(["APPROVED", "PENDING", "REJECTED"]);

const QuotationLineItemSchema = z.object({
  itemId: z.string().uuid("Invalid item ID"),
  itemName: z.string().min(1, "Item name is required"),
  code: z.string().min(1, "HSN/SAC code is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  price: z.number().nonnegative("Price must be non-negative"),
  discountPercent: z.number().min(0).max(100),
  discountAmount: z.number().nonnegative(),
  taxPercent: z.number().min(0).max(100),
  taxAmount: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

const QuotationDetailsSchema = z.object({
  partyAddress: z.string().min(1, "Party address is required"),
  partyPostalCode: z.string().min(1, "Postal code is required"),
  stateOfSupply: z.string().min(1, "State of supply is required"),
  refNoSuffix: z.string().min(1, "Ref suffix is required"),
  items: z.array(QuotationLineItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().nonnegative(),
  taxTotal: z.number().nonnegative(),
  tdsPercent: z.number().min(0).max(100),
  tdsAmount: z.number().nonnegative(),
  roundOff: z.number(),
  grandTotal: z.number().nonnegative(),
  description: z.string().optional().nullable(),
  termsAndConditions: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  gstCategory: z.enum(["GST", "IGST", "EXEMPTED"]).default("GST"),
  images: z.array(
    z.object({
      name: z.string(),
      data: z.string(),
      size: z.string().optional().nullable(),
    })
  ).optional().nullable(),
  documents: z.array(
    z.object({
      name: z.string(),
      data: z.string(),
      size: z.string().optional().nullable(),
    })
  ).optional().nullable(),
});

export const CreateQuotationSchema = z.object({
  partyName: z.string().min(2, "Party name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  refNo: z.string().min(2, "Ref No is required"),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  status: QuotationStatusEnum.default("PENDING"),
  assignedToId: z.string().uuid().optional().nullable().or(z.literal("")),
  prospectId: z.string().uuid().optional().nullable().or(z.literal("")),
  details: QuotationDetailsSchema,
});

export const UpdateQuotationSchema = z.object({
  partyName: z.string().min(2, "Party name is required").optional(),
  contactPerson: z.string().min(2, "Contact person is required").optional(),
  refNo: z.string().min(2, "Ref No is required").optional(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }).optional(),
  status: QuotationStatusEnum.optional(),
  assignedToId: z.string().uuid().optional().nullable().or(z.literal("")),
  prospectId: z.string().uuid().optional().nullable().or(z.literal("")),
  details: QuotationDetailsSchema.optional(),
});

export const QuotationFilterSchema = z.object({
  search: z.string().optional(),
  status: z.union([QuotationStatusEnum, z.array(QuotationStatusEnum)]).optional(),
  assignedToId: z.union([z.string().uuid(), z.array(z.string().uuid())]).optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof UpdateQuotationSchema>;
export type QuotationFilterInput = z.infer<typeof QuotationFilterSchema>;
