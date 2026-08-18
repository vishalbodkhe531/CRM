import { useAppSelector } from "@/hooks/useRedux";
import { selectCurrentUser } from "../store/selectors";

type Permission = 
  | "users:manage" 
  | "system:manage"
  | "items:manage"
  | "items:delete"
  | "leads:manage"; 

export const usePermissions = () => {
  const user = useAppSelector(selectCurrentUser);

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const isAdmin = isSuperAdmin || user.role === "ADMIN";
    const isManager = user.role === "MANAGER";
    const isExecutive = user.role === "EXECUTIVE";

    switch (permission) {
      case "users:manage":
        return isAdmin || isManager;
      
      case "system:manage":
        return isSuperAdmin;

      case "items:manage":
        return isAdmin || isManager;
      
      case "items:delete":
        return isAdmin;

      case "leads:manage":
        return isAdmin || isManager || isExecutive;
        
      default:
        return false;
    }
  };

  return { hasPermission };
};
