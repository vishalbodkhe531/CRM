import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import FormField from "@/components/common/FormField";
import PasswordInput from "@/components/common/PasswordInput";
import { pagePanelClass } from "@/components/common/uiTokens";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/hooks/useRedux";
import { cn } from "@/utils/cn";
import {
  ChangePasswordSchema,
  type ChangePasswordInput as ChangePasswordFormValues,
} from "@/contracts/validation";
import { changePassword } from "../../store/slice";

const inputClassName =
  "h-9 rounded-md border-0 bg-[rgb(var(--input-editable))] px-4 text-sm text-foreground shadow-none placeholder:text-muted-foreground/60 hover:bg-muted/70 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/25 dark:bg-muted/50 dark:focus-visible:bg-background";

interface ChangePasswordFormProps {
  variant?: "standalone" | "embedded";
}

const ChangePasswordForm = ({
  variant = "standalone",
}: ChangePasswordFormProps) => {
  const dispatch = useAppDispatch();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = form;

  const onSubmit = async (data: ChangePasswordFormValues) => {
    const result = await dispatch(changePassword(data));

    if (changePassword.fulfilled.match(result)) {
      reset();
    }
  };

  const fields = (
    <div
      className={`grid min-w-0 grid-cols-1 gap-x-5 gap-y-4 *:min-w-0 ${
        variant === "embedded" ? "lg:grid-cols-3" : ""
      }`}
    >
      <FormField
        label="Current Password"
        error={errors.currentPassword?.message}
        required
      >
        <PasswordInput
          {...register("currentPassword")}
          placeholder="Enter Password"
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="New Password"
        error={errors.newPassword?.message}
        required
      >
        <PasswordInput
          {...register("newPassword")}
          placeholder="Enter Password"
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Confirm New Password"
        error={errors.confirmPassword?.message}
        required
      >
        <PasswordInput
          {...register("confirmPassword")}
          placeholder="Enter Password"
          className={inputClassName}
        />
      </FormField>
    </div>
  );

  if (variant === "embedded") {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {fields}
        <div className="flex justify-stretch border-t border-border pt-5 sm:justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 w-full rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-none hover:bg-primary-hover sm:w-auto"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className={cn(pagePanelClass, "w-full min-w-0")}>
      <h3 className="mb-5 text-base font-bold text-foreground">
        Change Password
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {fields}

        <div className="flex justify-stretch pt-1 sm:justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 w-full rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-none hover:bg-primary-hover sm:w-auto"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
