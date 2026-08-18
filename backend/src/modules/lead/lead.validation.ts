import { Role, UserStatus } from "@prisma/client";
import { AppError } from "../../utils/errors/appError";
import { userRepository } from "../user/user.repository";
import type { SafeUser } from "../../types/user.types";

export const validateLeadAssignee = async (
  assigneeId: string,
  organizationId: string,
  assigner: SafeUser,
): Promise<void> => {
  // If assigning to self, always allowed (except potentially for cross-org checks, but assigner.org should match)
  const isSelf = assigneeId === assigner.id;

  const assignee = await userRepository.findById(assigneeId, organizationId, {
    id: true,
    organizationId: true,
    role: true,
    status: true,
  });

  if (!assignee) {
    throw AppError.resource.notFound("User", assigneeId);
  }

  if (assignee.status !== UserStatus.ACTIVE) {
    throw AppError.validation.badRequest(
      "Cannot assign a lead to an inactive user",
    );
  }

  if (assignee.organizationId !== organizationId) {
    throw AppError.authorization.forbidden(
      "Cannot assign a lead outside the selected organization",
    );
  }

  // Role matrix validation
  if (assigner.role === Role.EXECUTIVE) {
    if (!isSelf) {
      throw AppError.authorization.forbidden(
        "Executives can only assign leads to themselves",
      );
    }
  } else if (assigner.role === Role.MANAGER) {
    if (!isSelf && assignee.role !== Role.EXECUTIVE) {
      throw AppError.authorization.forbidden(
        "Managers can only assign leads to themselves or executives",
      );
    }
  }
  // Admin and Super Admin can assign to anyone (already checked assignee is in org)
};
