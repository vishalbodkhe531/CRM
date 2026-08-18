import { z } from "zod";
import { LeadStatus } from "@/constants/enums";

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
});

export type UpdateLeadStatusForm = z.infer<typeof updateLeadStatusSchema>;
