import type { Prospect } from "@/contracts/types";
import type { ProspectFormValues } from "../types";

export const prospectToFormValues = (prospect: Prospect): ProspectFormValues => {
  return {
    firstName: prospect.lead?.firstName ?? "",
    lastName: prospect.lead?.lastName ?? "",
    email: prospect.lead?.email ?? "",
    mobile: prospect.lead?.mobile ?? "",
    companyName: prospect.lead?.companyName ?? "",
    expectedValue: prospect.expectedValue ? String(prospect.expectedValue) : "",
    assignedToId: prospect.assignedToId ?? "",
    notes: prospect.notes ?? "",
  };
};
