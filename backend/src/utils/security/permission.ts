import { Role } from "@prisma/client";
import { ROLES } from "../../constants/roles";

/**
 * permission.ts - Centralized Role-Based Access Control logic
 */

export const permissions = {
  /**
   * Checks if a user with 'currentRole' can create/assign a 'targetRole'
   */
  canCreateRole: (currentRole: Role, targetRole: Role): boolean => {
    if (currentRole === ROLES.SUPER_ADMIN) return true;
    
    if (currentRole === ROLES.ADMIN) {
      return targetRole === ROLES.MANAGER || targetRole === ROLES.EXECUTIVE;
    }
    
    if (currentRole === ROLES.MANAGER) {
      return targetRole === ROLES.EXECUTIVE;
    }
    
    return false;
  },

  /**
   * Checks if a user with 'currentRole' can manage (update/delete/disable) a user with 'targetRole'
   */
  canManageUser: (currentRole: Role, targetRole: Role): boolean => {
    if (currentRole === ROLES.SUPER_ADMIN) return true;
    
    if (currentRole === ROLES.ADMIN) {
      return targetRole === ROLES.MANAGER || targetRole === ROLES.EXECUTIVE;
    }
    
    if (currentRole === ROLES.MANAGER) {
      return targetRole === ROLES.EXECUTIVE;
    }
    
    return false;
  },

  /**
   * Checks if a user is attempting to perform a restricted self-update
   */
  isRestrictedSelfUpdate: (
    loggedInUserId: string,
    targetUserId: string,
    updateData: { role?: string }
  ): boolean => {
    // User cannot change their own role
    if (loggedInUserId === targetUserId && updateData.role) {
      return true;
    }
    return false;
  }
};
