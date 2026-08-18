import type { FC } from "react";
import { Button } from "@/components/ui/button";
import UserFormIdentityFields from "./UserFormIdentityFields";
import UserFormProfileFields from "./UserFormProfileFields";
import UserFormPasswordFields from "./UserFormPasswordFields";
import { useUserForm } from "../../hooks/useUserForm";
import type { User } from "../../types";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

interface UserEditFormProps {
  user?: User;
  isAdding?: boolean;
}

const UserEditForm: FC<UserEditFormProps> = ({ user, isAdding }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const {
    actionLoading,
    form,
    getError,
    onSubmit,
    inputClassName,
    isEdit,
    loggedInUser,
    managers,
  } = useUserForm({ user, isAdding });

  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
        <UserFormIdentityFields
          form={form}
          getError={getError}
          inputClassName={inputClassName}
          isEdit={isEdit}
          loggedInUserRole={loggedInUser?.role}
          managers={managers}
          organizationPrefix={loggedInUser?.organization?.prefix}
          user={user}
        />

        <UserFormProfileFields
          form={form}
          getError={getError}
          inputClassName={inputClassName}
        />

        {!isEdit && (
          <UserFormPasswordFields
            form={form}
            getError={getError}
            inputClassName={inputClassName}
          />
        )}
      </div>

      <div className="mt-5 flex flex-col-reverse items-stretch border-t border-border/30 pt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(scopedPath("/users"))}
          disabled={actionLoading}
          className="h-11 px-8 rounded-full border-border/50 bg-background hover:bg-accent/50 hover:text-accent-foreground transition-all font-bold"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={actionLoading}
          className="h-11 px-10 rounded-full font-bold shadow-sm bg-primary hover:opacity-90"
        >
          {actionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update User"
          ) : (
            "Create User"
          )}
        </Button>
      </div>
    </form>
  );
};

export default UserEditForm;
