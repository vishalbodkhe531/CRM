import PasswordInput from "@/components/common/PasswordInput";
import FormField from "@/components/common/FormField";
import type {
  UserFormFieldError,
  UserFormValues,
} from "../../hooks/useUserForm";
import type { UseFormReturn } from "react-hook-form";

interface UserFormPasswordFieldsProps {
  form: UseFormReturn<UserFormValues>;
  getError: UserFormFieldError;
  inputClassName: string;
}

const UserFormPasswordFields = ({
  form,
  getError,
  inputClassName,
}: UserFormPasswordFieldsProps) => {
  return (
    <>
      <FormField
        label="Password"
        error={getError("password")}
        required
      >
        <PasswordInput
          {...form.register("password")}
          placeholder="Enter password"
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Confirm Password"
        error={getError("confirmPassword")}
        required
      >
        <PasswordInput
          {...form.register("confirmPassword")}
          placeholder="Re-enter password"
          className={inputClassName}
        />
      </FormField>
    </>
  );
};

export default UserFormPasswordFields;
