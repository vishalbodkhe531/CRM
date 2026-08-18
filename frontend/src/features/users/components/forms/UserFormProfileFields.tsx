import { Input } from "@/components/ui/input";
import FormField from "@/components/common/FormField";
import type {
  UserFormFieldError,
  UserFormValues,
} from "../../hooks/useUserForm";
import type { UseFormReturn } from "react-hook-form";

interface UserFormProfileFieldsProps {
  form: UseFormReturn<UserFormValues>;
  getError: UserFormFieldError;
  inputClassName: string;
}

const UserFormProfileFields = ({
  form,
  getError,
  inputClassName,
}: UserFormProfileFieldsProps) => {
  return (
    <>
      <FormField
        label="First Name"
        error={getError("firstName")}
        required
      >
        <Input
          {...form.register("firstName")}
          placeholder="Enter first name"
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Last Name"
        error={getError("lastName")}
        required
      >
        <Input
          {...form.register("lastName")}
          placeholder="Enter last name"
          className={inputClassName}
        />
      </FormField>

      <FormField label="Email" error={getError("email")} required>
        <Input
          {...form.register("email")}
          placeholder="Enter work email address"
          type="email"
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Contact No"
        error={getError("mobile")}
        required
      >
        <Input
          {...form.register("mobile")}
          placeholder="Enter 10-digit contact number"
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Joining Date"
        error={getError("joiningDate")}
        required
      >
        <Input
          type="date"
          {...form.register("joiningDate")}
          placeholder="Select joining date"
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Designation"
        error={getError("designation")}
      >
        <Input
          {...form.register("designation")}
          placeholder="Enter designation"
          className={inputClassName}
        />
      </FormField>
    </>
  );
};

export default UserFormProfileFields;
