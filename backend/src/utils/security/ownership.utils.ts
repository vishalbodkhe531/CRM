import { AppError } from "../errors/appError";
import { ROLES } from "../../constants/roles";

/**
 * Ensures the user has ownership of the resource.
 */
export const ensureOwnership = (
  user: { id: string; role: string },
  resource: {
    assignedToId?: string | null;
    createdById?: string | null;
    assignedTo?: { managerId?: string | null } | null;
  },
) => {
  if (
    user.role === ROLES.EXECUTIVE &&
    resource.assignedToId !== user.id &&
    resource.createdById !== user.id
  ) {
    throw AppError.authorization.forbidden(
      "Access denied: You do not own this resource"
    );
  }

  if (user.role === ROLES.MANAGER) {
    const isOwner =
      resource.assignedToId === user.id || resource.createdById === user.id;
    const isSubordinate = resource.assignedTo?.managerId === user.id;

    if (!isOwner && !isSubordinate) {
      throw AppError.authorization.forbidden(
        "Access denied: You can only access resources created by you or assigned to you or your direct team"
      );
    }
  }
};

/**
 * Ensures the resource is active and can be modified.
 */
export const ensureIsActive = (
  resource: { deletedAt?: Date | null },
  resourceName = "Resource"
) => {
  if (resource.deletedAt) {
    throw AppError.business.ruleViolation(
      `${resourceName} is inactive and cannot be modified`
    );
  }
};
