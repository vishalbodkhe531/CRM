import { Controller, type UseFormReturn } from "react-hook-form";
import FormField from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Prospect } from "../../types";
import type { ProspectFormValues } from "../../validators/prospect.schema";
import type { UserPreview } from "@/features/leads/types";

interface ProspectFormSectionsProps {
  form: UseFormReturn<ProspectFormValues>;
  mode: "create" | "edit" | "view";
  prospect?: Prospect;
  assignableUsers: UserPreview[];
}

const ReadOnlyValue = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => (
  <div className="flex flex-col gap-1.5 py-1">
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <div className="text-sm font-medium text-foreground">
      {value || <span className="italic text-muted-foreground">No data provided</span>}
    </div>
  </div>
);

const ProspectFormSections = ({
  form,
  mode,
  prospect,
  assignableUsers,
}: ProspectFormSectionsProps) => {
  const {
    register,
    formState: { errors },
    watch,
    control,
  } = form;

  const isView = mode === "view";

  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...assignableUsers.map((assignee) => ({
      value: assignee.id,
      label: `${assignee.firstName} ${assignee.lastName} (${assignee.email})`,
    })),
  ];

  if (isView) {
    return (
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
        <ReadOnlyValue label="Prospect No" value={prospect?.prospectNo} />
        <ReadOnlyValue label="Lead No" value={prospect?.lead?.leadNo} />
        <ReadOnlyValue label="First Name" value={watch("firstName")} />
        <ReadOnlyValue label="Last Name" value={watch("lastName")} />
        <ReadOnlyValue label="Email Address" value={watch("email")} />
        <ReadOnlyValue label="Mobile Number" value={watch("mobile")} />
        <ReadOnlyValue label="Company Name" value={watch("companyName")} />
        <ReadOnlyValue
          label="Expected Value"
          value={watch("expectedValue") || undefined}
        />
        <ReadOnlyValue
          label="Assigned To"
          value={
            assigneeOptions.find((option) => option.value === watch("assignedToId"))
              ?.label
          }
        />
        <div className="md:col-span-2">
          <ReadOnlyValue label="Notes" value={watch("notes")} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
      <FormField label="Prospect No">
        <Input
          value={prospect?.prospectNo || "Auto-generated from lead conversion"}
          disabled
          className="cursor-not-allowed bg-muted/40"
        />
      </FormField>

      <FormField label="Lead No">
        <Input
          value={prospect?.lead?.leadNo || "Created from lead"}
          disabled
          className="cursor-not-allowed bg-muted/40"
        />
      </FormField>

      <FormField label="First Name" required error={errors.firstName?.message}>
        <Input {...register("firstName")} placeholder="Enter first name" />
      </FormField>

      <FormField label="Last Name" required error={errors.lastName?.message}>
        <Input {...register("lastName")} placeholder="Enter last name" />
      </FormField>

      <FormField label="Email Address" required error={errors.email?.message}>
        <Input {...register("email")} type="email" placeholder="Enter email address" />
      </FormField>

      <FormField label="Mobile Number" required error={errors.mobile?.message}>
        <Input {...register("mobile")} placeholder="Enter mobile number" />
      </FormField>

      <FormField label="Company Name" required error={errors.companyName?.message}>
        <Input {...register("companyName")} placeholder="Enter company name" />
      </FormField>

      <FormField label="Expected Value" error={errors.expectedValue?.message}>
        <Input {...register("expectedValue")} type="number" placeholder="Enter expected value" />
      </FormField>

      <FormField label="Assigned To" error={errors.assignedToId?.message}>
        <Controller
          name="assignedToId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={field.onChange}
              onOpenChange={(open) => {
                if (!open) {
                  field.onBlur();
                }
              }}
              options={assigneeOptions}
            />
          )}
        />
      </FormField>

      <div className="md:col-span-2">
        <FormField label="Notes" error={errors.notes?.message}>
          <textarea
            {...register("notes")}
            rows={4}
            placeholder="Add internal notes..."
            className="w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm shadow-sm outline-none transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          />
        </FormField>
      </div>
    </div>
  );
};

export default ProspectFormSections;
