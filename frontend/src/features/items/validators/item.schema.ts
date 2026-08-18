import { z } from 'zod';
import { CreateItemSchema, UpdateItemSchema } from "@/contracts/validation";

export const createItemSchema = CreateItemSchema;
export const updateItemSchema = UpdateItemSchema;

export type CreateItemForm = z.infer<typeof createItemSchema>;
export type UpdateItemForm = z.infer<typeof updateItemSchema>;
