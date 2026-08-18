import { z } from "zod";

export const prospectSchema = z.object({
  firstName: z.string().min(1, "First Name is required").max(100),
  lastName: z.string().min(1, "Last Name is required").max(100),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  mobile: z.string().min(10, "Mobile number is required").max(15),
  companyName: z.string().min(1, "Company Name is required"),
  expectedValue: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const updateProspectSchema = prospectSchema.partial();

export type ProspectFormValues = z.infer<typeof prospectSchema>;
