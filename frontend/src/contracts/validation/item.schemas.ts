import { z } from "zod";
import {
  GST_RATE_VALUES,
  ITEM_STATUS_VALUES,
  ITEM_TYPE_VALUES,
} from "../constants";

const ItemTypeEnum = z.enum(ITEM_TYPE_VALUES);
const ItemStatusEnum = z.enum(ITEM_STATUS_VALUES);
const GSTRateSchema = z.coerce.number().refine(
  (value) => GST_RATE_VALUES.includes(value as (typeof GST_RATE_VALUES)[number]),
  {
    message: "GST rate must be one of 0, 5, 12, 18, or 28",
  },
);
const OptionalCodeSchema = z.string().optional().or(z.literal(""));

const validateItemCodeByType = (
  data: {
    itemType?: z.infer<typeof ItemTypeEnum>;
    hsnCode?: string;
    sacCode?: string;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.itemType === "GOODS") {
    const hsnCode = data.hsnCode?.trim();

    if (!hsnCode) {
      ctx.addIssue({
        code: "custom",
        message: "HSN code is required for products",
        path: ["hsnCode"],
      });
    } else if (hsnCode.length < 4 || hsnCode.length > 8) {
      ctx.addIssue({
        code: "custom",
        message: "HSN code must be 4 to 8 characters",
        path: ["hsnCode"],
      });
    }
  }

  if (data.itemType === "SERVICE") {
    const sacCode = data.sacCode?.trim();

    if (!sacCode) {
      ctx.addIssue({
        code: "custom",
        message: "SAC code is required for services",
        path: ["sacCode"],
      });
    } else if (sacCode.length !== 6) {
      ctx.addIssue({
        code: "custom",
        message: "SAC code must be 6 characters",
        path: ["sacCode"],
      });
    }
  }
};

export const CreateItemSchema = z
  .object({
    name: z.string().min(2, "Item name is required"),
    itemCode: z
      .string()
      .min(2, "Item code must be at least 2 characters")
      .transform((value) => value.toUpperCase())
      .optional()
      .or(z.literal("")),
    itemType: ItemTypeEnum,
    hsnCode: OptionalCodeSchema,
    sacCode: OptionalCodeSchema,
    description: z.string().optional(),
    gstRate: GSTRateSchema,
    price: z.coerce.number().min(0, "Price must be non-negative"),
  })
  .superRefine(validateItemCodeByType);

export const UpdateItemSchema = z
  .object({
    name: z.string().min(2).optional(),
    itemCode: z
      .string()
      .min(2, "Item code must be at least 2 characters")
      .transform((value) => value.toUpperCase())
      .optional()
      .or(z.literal("")),
    itemType: ItemTypeEnum.optional(),
    description: z.string().optional(),
    gstRate: GSTRateSchema.optional(),
    price: z.coerce.number().min(0).optional(),
    hsnCode: OptionalCodeSchema,
    sacCode: OptionalCodeSchema,
    status: ItemStatusEnum.optional(),
  })
  .superRefine(validateItemCodeByType);

export const ItemFilterSchema = z.object({
  search: z.string().optional(),
  status: z.union([ItemStatusEnum, z.array(ItemStatusEnum)]).optional(),
  itemType: z.union([ItemTypeEnum, z.array(ItemTypeEnum)]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
export type ItemFilterInput = z.infer<typeof ItemFilterSchema>;
