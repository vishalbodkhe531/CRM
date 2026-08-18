import { useEffect, type ChangeEventHandler } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import FormField from "@/components/common/FormField";
import PasswordInput from "@/components/common/PasswordInput";
import PdfAssetUploader from "@/components/common/PdfAssetUploader";
import { pagePanelClass } from "@/components/common/uiTokens";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { usePlans } from "@/features/billing";
import { usePlatformSettings } from "@/features/platformSettings";
import { resolveAssetUrl } from "@/utils/assetUrl";
import { cn } from "@/utils/cn";
import {
  FileUp,
  ImageIcon,
  QrCode,
  Signature,
  type LucideIcon
} from "lucide-react";
import type { Organization } from "../../types";
import type { OrganizationEditorState } from "../../validators/organization.schema";

type InputChangeHandler = ChangeEventHandler<HTMLInputElement>;
type OrganizationAssetField = "companyLogo" | "qrCode" | "signature";

const organizationTypeOptions = [
  { value: "type1", label: "Type 1" },
  { value: "type2", label: "Type 2" },
];

const organizationStatusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
];

export const OrgGeneralInfo = ({
  form,
  handleSlugChange,
  handlePrefixChange,
}: {
  form: UseFormReturn<OrganizationEditorState>;
  handleSlugChange: InputChangeHandler;
  handlePrefixChange: InputChangeHandler;
}) => {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
        General Information
      </h3>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <FormField
          label="Organization Name"
          required
          error={errors.name?.message}
        >
          <Input placeholder="e.g. Acme Corporation" {...register("name")} />
        </FormField>

        <FormField
          label="Authorized Person"
          required
          error={errors.authorizedPerson?.message}
        >
          <Input
            placeholder="e.g. John Doe"
            {...register("authorizedPerson")}
          />
        </FormField>

        <FormField label="Slug" required error={errors.slug?.message}>
          <Input
            placeholder="e.g. acme-corp"
            {...register("slug")}
            onChange={handleSlugChange}
          />
        </FormField>

        <FormField label="Prefix" required error={errors.prefix?.message}>
          <Input
            placeholder="e.g. ACME"
            {...register("prefix")}
            onChange={handlePrefixChange}
          />
        </FormField>

        <FormField
          label="Organization Type"
          required
          error={errors.orgType?.message as string | undefined}
        >
          <Controller
            name="orgType"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (value === "type1" || value === "type2") {
                    field.onChange(value);
                  }
                }}
                onOpenChange={(open) => {
                  if (!open) {
                    field.onBlur();
                  }
                }}
                options={organizationTypeOptions}
              />
            )}
          />
        </FormField>

        <FormField
          label="Registration Date"
          required
          error={errors.dateOfRegistration?.message}
        >
          <Input type="date" {...register("dateOfRegistration")} />
        </FormField>
      </div>
    </div>
  );
};

export const OrgContactInfo = ({
  form,
  handleGstinChange,
}: {
  form: UseFormReturn<OrganizationEditorState>;
  handleGstinChange: InputChangeHandler;
}) => {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
        Contact & Legal Details
      </h3>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <FormField label="Email Address" required error={errors.email?.message}>
          <Input
            type="email"
            placeholder="e.g. contact@acme.com"
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Mobile Number"
          required
          error={errors.mobile?.message}
        >
          <Input placeholder="e.g. 9876543210" {...register("mobile")} />
        </FormField>

        <FormField label="GSTIN" error={errors.gstin?.message}>
          <Input
            placeholder="e.g. 22AAAAA0000A1Z5"
            {...register("gstin")}
            onChange={handleGstinChange}
          />
        </FormField>

        <div className="xl:col-span-3">
          <FormField
            label="Office Address"
            required
            error={errors.address?.message}
          >
            <Input
              placeholder="e.g. 123 Business Park, Silicon Valley"
              {...register("address")}
            />
          </FormField>
        </div>

        <div className="xl:col-span-3">
          <FormField label="Remarks" error={errors.remark?.message}>
            <textarea
              {...register("remark")}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

const assetConfig: {
  field: OrganizationAssetField;
  label: string;
  icon: LucideIcon;
  previewClassName: string;
}[] = [
  {
    field: "companyLogo",
    label: "Company Logo",
    icon: ImageIcon,
    previewClassName: "h-8 w-12 object-contain",
  },
  {
    field: "qrCode",
    label: "QR Code",
    icon: QrCode,
    previewClassName: "h-9 w-9 object-contain",
  },
  {
    field: "signature",
    label: "Signature",
    icon: Signature,
    previewClassName: "h-8 w-12 object-contain",
  },
];

export const OrgPdfAssets = ({
  organization,
  assetPreviews,
  handleAssetChange,
}: {
  organization?: Organization;
  assetPreviews: Partial<Record<OrganizationAssetField, string>>;
  handleAssetChange: (
    field: OrganizationAssetField,
  ) => ChangeEventHandler<HTMLInputElement>;
}) => {
  return (
    <section className={cn(pagePanelClass, "space-y-5")}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
          <FileUp className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-tight text-foreground">
            Quotation PDF Assets
          </h3>
          <p className="mt-1 text-xs font-medium leading-snug text-muted-foreground">
            Upload or update the assets that will appear in your quotation PDF.
          </p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 *:min-w-0">
        {assetConfig.map((asset) => {
          const currentValue = organization?.[asset.field] ?? null;
          const previewUrl =
            assetPreviews[asset.field] ?? resolveAssetUrl(currentValue);
          const inputId = `organization-${asset.field}`;

          return (
            <PdfAssetUploader
              key={asset.field}
              id={inputId}
              label={asset.label}
              icon={asset.icon}
              previewUrl={previewUrl}
              previewClassName={asset.previewClassName}
              onChange={handleAssetChange(asset.field)}
              compact
            />
          );
        })}
      </div>
    </section>
  );
};

const formatPlanOptionLabel = (plan: {
  name: string;
  priceMinor: number;
  billingCycle: string;
}) => {
  const price =
    plan.priceMinor > 0
      ? `₹${(plan.priceMinor / 100).toLocaleString("en-IN")} / ${plan.billingCycle.toLowerCase()}`
      : "Free";
  return `${plan.name} — ${price}`;
};

export const OrgAdminCredentials = ({
  form,
}: {
  form: UseFormReturn<OrganizationEditorState>;
}) => {
  const {
    register,
    formState: { errors },
  } = form;

  // Only super-admins reach the create form, so usePlans is enabled here. The
  // backend gates includePrivate to super-admins, so this surfaces private/
  // enterprise assignable plans, not just the public catalogue.
  const { data: plansResult, isLoading: isLoadingPlans } = usePlans({
    limit: 100,
    includePrivate: true,
  });
  const planOptions = (plansResult?.data ?? []).map((plan) => ({
    value: plan.id,
    label: formatPlanOptionLabel(plan),
  }));

  /**
   * Pre-select the platform default, once, and only into an empty field.
   *
   * The choice stays explicit and visible — a plan carries a price — but the
   * operator does not have to remember which plan is standard. Guarding on an
   * empty value means this never overwrites a selection, including when the
   * plans query refetches.
   */
  const { data: platformSettings } = usePlatformSettings();
  const defaultPlanId = platformSettings?.data?.defaultPlanId ?? null;
  const selectedPlanId = form.watch("planId");

  useEffect(() => {
    if (selectedPlanId || !defaultPlanId) return;
    if (!planOptions.some((option) => option.value === defaultPlanId)) return;

    form.setValue("planId", defaultPlanId);
  }, [defaultPlanId, selectedPlanId, planOptions, form]);

  return (
    <div className="space-y-6 rounded-2xl border border-primary/20 bg-primary/5 p-6">
      <div className="flex items-center gap-2 text-primary">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
          Primary Admin Credentials
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <FormField
            label="Subscription Plan"
            required
            error={errors.planId?.message as string | undefined}
          >
            <Controller
              name="planId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  onOpenChange={(open) => {
                    if (!open) field.onBlur();
                  }}
                  disabled={isLoadingPlans}
                  placeholder={
                    isLoadingPlans ? "Loading plans…" : "Select a plan"
                  }
                  options={planOptions}
                />
              )}
            />
          </FormField>
        </div>

        <FormField
          label="Admin First Name"
          required
          error={errors.adminFirstName?.message}
        >
          <Input
            placeholder="Admin's first name"
            {...register("adminFirstName")}
          />
        </FormField>

        <FormField
          label="Admin Last Name"
          required
          error={errors.adminLastName?.message}
        >
          <Input
            placeholder="Admin's last name"
            {...register("adminLastName")}
          />
        </FormField>

        <FormField
          label="Admin Email"
          required
          error={errors.adminEmail?.message}
        >
          <Input
            type="email"
            placeholder="admin@organization.com"
            {...register("adminEmail")}
          />
        </FormField>

        <FormField
          label="Admin Mobile"
          required
          error={errors.adminMobile?.message}
        >
          <Input
            placeholder="10-digit mobile number"
            {...register("adminMobile")}
          />
        </FormField>

        <div className="xl:col-span-1">
          <FormField
            label="Admin Password"
            required
            error={errors.adminPassword?.message}
          >
            <PasswordInput
              placeholder="At least 8 characters"
              {...register("adminPassword")}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};
