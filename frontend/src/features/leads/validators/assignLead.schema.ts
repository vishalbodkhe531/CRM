import { z } from "zod";

export const assignLeadSchema = z.object({
  executiveId: z.string().uuid({ message: "Invalid executive selected" }),
});

export type AssignLeadForm = z.infer<typeof assignLeadSchema>;
