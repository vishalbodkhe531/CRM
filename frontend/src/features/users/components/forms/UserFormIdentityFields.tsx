import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import FormField from "@/components/common/FormField";
import type { User } from "../../types";
import type {
  UserFormFieldError,
  UserFormValues,
} from "../../hooks/useUserForm";

interface UserFormIdentityFieldsProps {
  form: UseFormReturn<UserFormValues>;
  getError: UserFormFieldError;
  inputClassName: string;
  isEdit: boolean;
  loggedInUserRole?: string;
  managers?: User[];
  organizationPrefix?: string;
  user?: User;
}

const UserFormIdentityFields = ({
  form,
  getError,
  inputClassName,
  isEdit,
  loggedInUserRole,
  managers = [],
  organizationPrefix,
  user,
}: UserFormIdentityFieldsProps) => {
  const showRoleForSuperAdmin = loggedInUserRole === "SUPER_ADMIN";
  const showRoleForAdmin = loggedInUserRole === "ADMIN";
  const isExecutive = form.watch("role") === "EXECUTIVE";
  const isManagerCreation = loggedInUserRole === "MANAGER";
  const roleOptionsForSuperAdmin = [
    { value: "", label: "Select Role" },
    { value: "ADMIN", label: "Admin" },
    { value: "MANAGER", label: "Manager" },
    { value: "EXECUTIVE", label: "Executive" },
  ];
  const roleOptionsForAdmin = [
    { value: "", label: "Select Role" },
    { value: "MANAGER", label: "Manager" },
    { value: "EXECUTIVE", label: "Executive" },
  ];
  const roleOptionsForManager = [{ value: "EXECUTIVE", label: "Executive" }];
  const managerOptions = [
    { value: "", label: "Select Manager" },
    ...managers.map((manager) => ({
      value: manager.id,
      label: `${manager.firstName} ${manager.lastName} (${manager.role})`,
    })),
  ];

  return (
    <>
      {!isEdit ? (
        <FormField
          label="Employee ID"
          error={getError("employeeId")}
          required={false}
        >
          <div className="relative flex items-center">
            {organizationPrefix ? (
              <>
                <span className="absolute left-4 text-muted-foreground text-sm font-medium">
                  {organizationPrefix}-
                </span>
                <Input
                  value="AUTO"
                  readOnly
                  placeholder="Auto-generated employee ID"
                  className={`${inputClassName} pl-18 bg-secondary/50 cursor-not-allowed text-muted-foreground`}
                />
              </>
            ) : (
              <Input
                {...form.register("employeeId")}
                placeholder="Will be auto-generated"
                className={inputClassName}
                disabled
              />
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Employee ID will be auto-generated with organization prefix.
          </p>
        </FormField>
      ) : (
        <FormField
          label="Employee ID"
          error={getError("employeeId")}
          required={false}
        >
          <div className="relative flex items-center">
            {organizationPrefix && user?.employeeId ? (
              <>
                <span className="absolute left-4 text-muted-foreground text-sm font-medium">
                  {organizationPrefix}-
                </span>
                <Input
                  value={user.employeeId.substring(organizationPrefix.length + 1)}
                  readOnly
                  placeholder="Assigned employee ID"
                  className={`${inputClassName} pl-18 bg-secondary/50 cursor-not-allowed`}
                />
              </>
            ) : (
              <Input
                value={user?.employeeId || "N/A"}
                readOnly
                placeholder="Assigned employee ID"
                className={`${inputClassName} bg-secondary/50 cursor-not-allowed`}
              />
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Employee ID cannot be changed once assigned.
          </p>
        </FormField>
      )}

      {showRoleForSuperAdmin ? (
        <FormField label="Role" error={getError("role")} required>
          <Controller
            name="role"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (
                    value === "ADMIN" ||
                    value === "MANAGER" ||
                    value === "EXECUTIVE"
                  ) {
                    field.onChange(value);
                  }
                }}
                onOpenChange={(open) => {
                  if (!open) {
                    field.onBlur();
                  }
                }}
                options={roleOptionsForSuperAdmin}
                placeholder="Select role"
                className={inputClassName}
              />
            )}
          />
        </FormField>
      ) : showRoleForAdmin ? (
        <FormField label="Role" error={getError("role")} required>
          <Controller
            name="role"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (value === "MANAGER" || value === "EXECUTIVE") {
                    field.onChange(value);
                  }
                }}
                onOpenChange={(open) => {
                  if (!open) {
                    field.onBlur();
                  }
                }}
                options={roleOptionsForAdmin}
                placeholder="Select role"
                className={inputClassName}
              />
            )}
          />
        </FormField>
      ) : loggedInUserRole === "MANAGER" ? (
        <FormField label="Role" error={getError("role")} required>
          <Controller
            name="role"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (value === "EXECUTIVE") {
                    field.onChange(value);
                  }
                }}
                onOpenChange={(open) => {
                  if (!open) {
                    field.onBlur();
                  }
                }}
                options={roleOptionsForManager}
                placeholder="Select role"
                className={inputClassName}
              />
            )}
          />
        </FormField>
      ) : (
        <div />
      )}

      {isExecutive && (
        <FormField
          label="Reporting Manager"
          error={getError("managerId")}
          required
        >
          <Controller
            name="managerId"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onOpenChange={(open) => {
                  if (!open) {
                    field.onBlur();
                  }
                }}
                options={managerOptions}
                placeholder="Select reporting manager"
                className={inputClassName}
                disabled={isManagerCreation}
              />
            )}
          />
          {isManagerCreation && (
            <p className="mt-1 text-xs text-muted-foreground">
              As a manager, you are automatically assigned as the reporting manager..
            </p>
          )}
        </FormField>
      )}
    </>
  );
};

export default UserFormIdentityFields;
