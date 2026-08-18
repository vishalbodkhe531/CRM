import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { ROLES } from "@/constants/roles";
import { useAppSelector } from "@/hooks/useRedux";
import { useUsers } from "./useUsers";
import { useCreateUser, useUpdateUser } from "./useUserMutations";
import type { CreateUserInput, UpdateUserInput } from "@/contracts/validation";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserForm,
  type UpdateUserForm,
} from "../validators/user.schema";
import type { User } from "../types";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

export type UserFormValues = CreateUserForm | UpdateUserForm;
export type UserFormFieldError = (field: string) => string | undefined;

interface UseUserFormProps {
  user?: User;
  isAdding?: boolean;
}

const MANAGER_CREATE_DEFAULTS: Pick<CreateUserForm, "role"> = {
  role: "EXECUTIVE",
};

/**
 * Normalizes User UI model to Form Values
 */
const mapUserToFormValues = (user: User): UpdateUserForm => {
  let formattedJoiningDate = "";
  if (user.joiningDate) {
    try {
      const date = new Date(user.joiningDate);
      if (!Number.isNaN(date.getTime())) {
        formattedJoiningDate = date.toISOString().split("T")[0];
      }
    } catch {
      formattedJoiningDate = "";
    }
  }

  const role =
    user.role === "ADMIN" || user.role === "MANAGER" || user.role === "EXECUTIVE"
      ? user.role
      : "EXECUTIVE";

  return {
    firstName: user.firstName,
    middleName: user.middleName ?? undefined,
    lastName: user.lastName,
    email: user.email,
    mobile: user.mobile ?? "",
    role,
    joiningDate: formattedJoiningDate,
    designation: user.designation ?? undefined,
    managerId: user.managerId ?? undefined,
  };
};

const toCreateUserInput = (data: CreateUserForm): CreateUserInput => ({
  role: data.role,
  firstName: data.firstName,
  middleName: data.middleName || undefined,
  lastName: data.lastName,
  mobile: data.mobile || undefined,
  email: data.email,
  password: data.password,
  designation: data.designation || undefined,
  joiningDate: data.joiningDate || undefined,
  managerId: data.managerId || undefined,
});

const toUpdateUserInput = (data: UpdateUserForm): UpdateUserInput => ({
  firstName: data.firstName,
  middleName: data.middleName || undefined,
  lastName: data.lastName,
  email: data.email,
  mobile: data.mobile || undefined,
  role: data.role,
  joiningDate: data.joiningDate || undefined,
  designation: data.designation || undefined,
  managerId: data.managerId || undefined,
});

export const useUserForm = ({ user, isAdding }: UseUserFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const { user: loggedInUser } = useAppSelector((state) => state.auth);

  const { mutateAsync: createUserMutation, isPending: isCreating } = useCreateUser();
  const { mutateAsync: updateUserMutation, isPending: isUpdating } = useUpdateUser();
  
  const actionLoading = isCreating || isUpdating;

  const shouldLoadManagers = loggedInUser?.role !== ROLES.MANAGER;
  const { data: managersData } = useUsers(
    { role: ROLES.MANAGER },
    { enabled: shouldLoadManagers },
  );
  const managers = managersData?.data || [];

  const isEdit = !isAdding;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    values: isEdit && user 
      ? mapUserToFormValues(user) 
      : !isEdit && loggedInUser?.role === ROLES.MANAGER 
        ? {
            ...MANAGER_CREATE_DEFAULTS,
            managerId: loggedInUser.id,
          } as UserFormValues
        : undefined,
  });

  const getError: UserFormFieldError = (field) => {
    const errors = form.formState.errors as Record<string, { message?: string }>;
    const errorMsg = errors[field]?.message;
    return typeof errorMsg === "string" ? errorMsg : undefined;
  };

  const handleSubmit = async (data: UserFormValues) => {
    try {
      if (isEdit && user) {
        await updateUserMutation({
          id: user.id,
          data: toUpdateUserInput(data as UpdateUserForm),
        });
      } else {
        await createUserMutation(toCreateUserInput(data as CreateUserForm));
      }

      navigate(scopedPath("/users"));
    } catch {
      // Handled in completion
    }
  };

  return {
    actionLoading,
    form,
    getError,
    onSubmit: form.handleSubmit(handleSubmit),
    inputClassName: "",
    isEdit,
    loggedInUser,
    managers,
  };
};
