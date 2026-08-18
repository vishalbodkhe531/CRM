import { AVAILABLE_LEAD_STATUSES } from "../../constants/lead.constants";
import { ROLES } from "../../constants/roles";
import { AppError } from "../errors/appError";
import { ensureIsActive } from "../security/ownership.utils";

// No transition restrictions - allow any-to-any status changes

type LeadStatusValue = (typeof AVAILABLE_LEAD_STATUSES)[number];

const isLeadStatusValue = (value: string): value is LeadStatusValue => {
  return AVAILABLE_LEAD_STATUSES.some((status) => status === value);
};

type LeadLike = {
  deletedAt?: Date | null;
  convertedAt?: Date | null;
  prospect?: { id: string; deletedAt?: Date | null } | null;
};

export const ensureEditableLead = (lead: LeadLike) => {
  ensureIsActive(lead, "Lead");
};

// Transition validation removed - non-converted leads can change to any status

export const ensureStatusChangeAllowed = (
  lead: LeadLike,
  user: { role: string },
) => {
  const isConverted = !!lead.prospect?.id && !lead.prospect.deletedAt;
  if (
    isConverted &&
    user.role !== ROLES.ADMIN &&
    user.role !== ROLES.SUPER_ADMIN
  ) {
    throw AppError.authorization.forbidden(
      "Only administrators can change the status of a converted lead",
    );
  }
};
