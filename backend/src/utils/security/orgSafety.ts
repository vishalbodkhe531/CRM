import { AppError } from "../errors/appError";
import { ROLES } from "../../constants/roles";

/**
 * Reusable helper to ensure a resource belongs to the user's organization.
 */
export const ensureSameOrg = (
  user: { role: string; organizationId?: string | null } | undefined,
  resourceOrgId: string | null | undefined
) => {
  if (!user) {
    throw AppError.authentication.tokenInvalid("Authentication required");
  }

  if (user.role === ROLES.SUPER_ADMIN) {
    return;
  }

  const userOrgId = user.organizationId ?? undefined;
  const targetOrgId = resourceOrgId ?? undefined;

  if (!userOrgId) {
    throw AppError.authorization.forbidden("User must belong to an organization");
  }

  if (!targetOrgId || userOrgId !== targetOrgId) {
    throw AppError.authorization.forbidden(
      "Access denied: Resource belongs to another organization"
    );
  }
};
