import { z } from "zod";
import { LEAD_SOURCE_VALUES } from "../constants";

const LeadSourceEnum = z.enum(LEAD_SOURCE_VALUES);

export const ReportFilterSchema = z.object({
  section: z.enum(["summary", "leads", "prospects", "quotations", "performance"]).optional(),
  range: z.enum(["All Time", "Today", "This Week", "This Month", "Custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  executiveId: z.string().uuid().optional(),
  source: LeadSourceEnum.optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
}).refine(
  (data) => {
    if (data.from && data.to) {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      return fromDate <= toDate;
    }
    return true;
  },
  {
    message: "'from' date must be before or equal to 'to' date",
    path: ["from"],
  }
).refine(
  (data) => {
    if (data.from && data.to) {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays <= 366;
    }
    return true;
  },
  {
    message: "Date range cannot exceed 366 days",
    path: ["to"],
  }
);

export type ReportFilterInput = z.infer<typeof ReportFilterSchema>;
