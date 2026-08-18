import {
  Controller,
  type ControllerRenderProps,
  type UseFormReturn,
} from "react-hook-form";
import { useEffect, useRef } from "react";
import { z } from "zod";
import FormField from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  isLeadIndustryValue,
  isLeadSourceValue,
  leadIndustryOptions,
  leadSourceOptions,
  leadTypeOptions,
} from "@/features/leads";
import { useAuth } from "@/features/auth";
import { ROLES } from "@/constants/roles";
import { cn } from "@/utils/cn";
import type { Lead, ItemPreview, UserPreview } from "@/features/leads";
import type { CreateLeadForm } from "../../validators/createLead.schema";

const requiredTextField = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

const requiredLeadFormFieldSchemas = {
  leadType: requiredTextField("Lead title"),
  firstName: requiredTextField("First name"),
  lastName: requiredTextField("Last name"),
  mobile: requiredTextField("Mobile number").regex(
    /^[0-9]{10}$/,
    "Enter a valid 10-digit mobile number",
  ),
  email: requiredTextField("Email address").email(
    "Enter a valid email address",
  ),
  companyName: requiredTextField("Company name"),
  source: requiredTextField("Lead source"),
  address: requiredTextField("Address"),
  productInterested: requiredTextField("Product / Service Interested"),
};

const requiredLeadFormSectionSchema = z.object(requiredLeadFormFieldSchemas);
type RequiredLeadFormField = keyof typeof requiredLeadFormFieldSchemas;
const requiredLeadFormFieldNames = Object.keys(
  requiredLeadFormFieldSchemas,
) as RequiredLeadFormField[];

export const LeadFormSections = ({
  form,
  items,
  assignableUsers,
  lead,
  isAdding,
  isExecutive,
  mode,
}: {
  form: UseFormReturn<CreateLeadForm>;
  items: ItemPreview[];
  assignableUsers: UserPreview[];
  lead?: Lead;
  isAdding?: boolean;
  isExecutive: boolean;
  mode: "view" | "edit" | "create";
}) => {
  const { user: currentUser } = useAuth();
  const formSectionRef = useRef<HTMLDivElement>(null);
  const {
    register,
    formState: { errors },
  } = form;

  const isConverted = !!lead?.isConverted;
  const isView = mode === "view";
  const isAdmin =
    currentUser?.role === ROLES.ADMIN ||
    currentUser?.role === ROLES.SUPER_ADMIN;

  const isDisabled = isView || (isConverted && !isAdmin);
  const watchedIndustry = form.watch("industry");
  const isOtherIndustry = watchedIndustry === "OTHER";

  const itemOptions = [
    { value: "", label: "Select product or service" },
    ...items.map((item) => ({
      value: item.id,
      label: `${item.name} (${item.itemCode})`,
    })),
  ];

  const assignableUserOptions = [
    { value: "", label: "Select assignee" },
    ...assignableUsers.map((u) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName} (${u.email})`,
    })),
  ];

  const fieldClasses = "transition-all";
  const handleSelectBlur = (
    open: boolean,
    field: ControllerRenderProps<CreateLeadForm>,
  ) => {
    if (!open) {
      field.onBlur();
    }
  };

  const validateFieldValue = (
    fieldName: RequiredLeadFormField,
    value: unknown,
  ) => {
    const result = requiredLeadFormFieldSchemas[fieldName].safeParse(value);

    if (result.success) {
      form.clearErrors(fieldName);
      return true;
    }

    form.setError(fieldName, {
      type: "zod",
      message: result.error.issues[0]?.message,
    });
    return false;
  };

  const validateRequiredField = (fieldName: RequiredLeadFormField) =>
    validateFieldValue(fieldName, form.getValues(fieldName));

  const registerRequiredField = (fieldName: RequiredLeadFormField) =>
    register(fieldName, {
      onBlur: () => validateRequiredField(fieldName),
    });

  useEffect(() => {
    if (isDisabled) {
      return;
    }

    const formElement = formSectionRef.current?.closest("form");
    if (!formElement) {
      return;
    }

    const validateBeforeSubmit = (event: SubmitEvent) => {
      const result = requiredLeadFormSectionSchema.safeParse(form.getValues());
      form.clearErrors(requiredLeadFormFieldNames);

      if (result.success) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const fieldsWithErrors = new Set<RequiredLeadFormField>();
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as RequiredLeadFormField | undefined;
        if (!fieldName || fieldsWithErrors.has(fieldName)) {
          return;
        }

        fieldsWithErrors.add(fieldName);
        form.setError(fieldName, {
          type: "zod",
          message: issue.message,
        });
      });
    };

    formElement.addEventListener("submit", validateBeforeSubmit, true);

    return () => {
      formElement.removeEventListener("submit", validateBeforeSubmit, true);
    };
  }, [form, isDisabled]);

  return (
    <div
      ref={formSectionRef}
      className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8"
    >
      <FormField label="Lead ID" required>
        <Input
          value={lead?.leadNo || "Auto-generated"}
          disabled
          placeholder="Auto-generated lead ID"
          className="h-10 cursor-not-allowed border-border/50 bg-muted/40 font-bold"
        />
      </FormField>

      <FormField label="Lead Title" required error={errors.leadType?.message}>
        <Controller
          name="leadType"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                if (value === "NEW" || value === "EXISTING") {
                  field.onChange(value);
                  validateFieldValue("leadType", value);
                }
              }}
              onOpenChange={(open) => handleSelectBlur(open, field)}
              options={leadTypeOptions}
              placeholder="Select lead title"
              disabled={isDisabled}
              className={fieldClasses}
            />
          )}
        />
      </FormField>

      <FormField label="First Name" required error={errors.firstName?.message}>
        <Input
          placeholder="Enter first name"
          {...registerRequiredField("firstName")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <FormField label="Last Name" required error={errors.lastName?.message}>
        <Input
          placeholder="Enter last name"
          {...registerRequiredField("lastName")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <FormField label="Mobile No" required error={errors.mobile?.message}>
        <Input
          placeholder="Enter 10-digit mobile number"
          {...registerRequiredField("mobile")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <FormField label="Alternate Mobile No">
        <Input
          placeholder="Enter alternate mobile number"
          {...register("alternateMobile")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <FormField label="Email Address" required error={errors.email?.message}>
        <Input
          type="email"
          placeholder="Enter email address"
          {...registerRequiredField("email")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <FormField
        label="Company Name"
        required
        error={errors.companyName?.message}
      >
        <Input
          placeholder="Enter company name"
          {...registerRequiredField("companyName")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <FormField label="GSTIN" error={errors.gstin?.message}>
        <Input
          placeholder="Enter GSTIN (optional)"
          {...register("gstin")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <FormField label="Lead Source" required error={errors.source?.message}>
        <Controller
          name="source"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                if (isLeadSourceValue(value)) {
                  field.onChange(value);
                  validateFieldValue("source", value);
                }
              }}
              onOpenChange={(open) => handleSelectBlur(open, field)}
              options={leadSourceOptions}
              placeholder="Select lead source"
              disabled={isDisabled}
              className={fieldClasses}
            />
          )}
        />
      </FormField>

      <FormField label="Industry" error={errors.industry?.message}>
        <Controller
          name="industry"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(value) => {
                field.onChange(
                  value === ""
                    ? undefined
                    : isLeadIndustryValue(value)
                      ? value
                      : undefined,
                );
                // Clear customIndustry when switching away from OTHER
                if (value !== "OTHER") {
                  form.setValue("customIndustry", "");
                }
              }}
              onOpenChange={(open) => handleSelectBlur(open, field)}
              options={leadIndustryOptions}
              placeholder="Select industry"
              disabled={isDisabled}
              className={fieldClasses}
            />
          )}
        />
        {isOtherIndustry && (
          <div
            style={{
              overflow: "hidden",
              maxHeight: isOtherIndustry ? "60px" : "0px",
              opacity: isOtherIndustry ? 1 : 0,
              transition: "max-height 0.25s ease, opacity 0.2s ease",
              marginTop: "8px",
            }}
          >
            <Input
              placeholder="Specify industry"
              {...register("customIndustry")}
              readOnly={isDisabled}
              className={fieldClasses}
              autoFocus={!isDisabled}
            />
            {errors.customIndustry?.message && (
              <p className="mt-1 text-xs text-destructive">
                {errors.customIndustry.message}
              </p>
            )}
          </div>
        )}
      </FormField>

      <FormField
        label="Product / Service Interested"
        required
        error={errors.productInterested?.message}
      >
        <Controller
          name="productInterested"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(value) => {
                field.onChange(value);
                validateFieldValue("productInterested", value);
              }}
              onOpenChange={(open) => handleSelectBlur(open, field)}
              options={itemOptions}
              placeholder="Select product or service"
              disabled={isDisabled}
              className={fieldClasses}
            />
          )}
        />
      </FormField>

      <FormField label="Assign" error={errors.assignedToId?.message}>
        {isExecutive && !isAdding ? (
          <div
            className={cn(
              "group-hover:border-primary/20 flex h-10 items-center justify-between rounded-md border border-border/50 bg-muted/10 p-2.5 text-sm text-muted-foreground",
              isView &&
                "cursor-default border-transparent bg-muted/5 shadow-none",
            )}
          >
            <span>
              {lead?.assignedTo
                ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                : "Approval Required"}
            </span>
          </div>
        ) : (
          <Controller
            name="assignedToId"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onOpenChange={(open) => handleSelectBlur(open, field)}
                options={assignableUserOptions}
                placeholder="Select assignee"
                disabled={(isExecutive && isAdding) || isDisabled}
                className={fieldClasses}
              />
            )}
          />
        )}
      </FormField>

      <div className="min-w-0 md:col-span-2 lg:col-span-2">
        <FormField label="Address" required error={errors.address?.message}>
          <Input
            placeholder="Enter full address"
            {...registerRequiredField("address")}
            readOnly={isDisabled}
            className={fieldClasses}
          />
        </FormField>
      </div>

      <FormField label="City" error={errors.city?.message}>
        <Input
          placeholder="Enter city"
          {...register("city")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <FormField label="State" error={errors.state?.message}>
        <Input
          placeholder="Enter state"
          {...register("state")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <FormField label="Pin Code" error={errors.pinCode?.message}>
        <Input
          placeholder="Enter pin code"
          {...register("pinCode")}
          readOnly={isDisabled}
          className={fieldClasses}
        />
      </FormField>

      <div className="min-w-0 md:col-span-2 lg:col-span-3">
        <FormField
          label="Requirement Description"
          error={errors.requiredDescription?.message}
        >
          <textarea
            {...register("requiredDescription")}
            placeholder="Add enquiry details or requirement description"
            rows={4}
            readOnly={isDisabled}
            className={cn(
              "w-full resize-none rounded-2xl border border-input bg-card/10 px-4 py-3 text-sm shadow-sm outline-none transition-all md:text-sm",
              "hover:border-primary/50 hover:bg-card/20",
              "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 focus-visible:bg-card",
              isDisabled &&
                "cursor-default border-transparent bg-muted/5 shadow-none focus-visible:ring-0",
            )}
          />
        </FormField>
      </div>
    </div>
  );
};
