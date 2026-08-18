import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { Save } from "lucide-react";

import FormField from "@/components/common/FormField";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { pagePanelClass } from "@/components/common/uiTokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { usePlans } from "@/features/billing";
import type { PlatformSettingsPayload } from "../../api/services";
import {
  usePlatformSettings,
  useUpdatePlatformSettings,
} from "../../hooks/usePlatformSettings";

/**
 * Super-admin platform configuration.
 *
 * Deliberately not a tab on /settings: that page is a tenant's own organization
 * preferences, and a super-admin has no organization. Everything here applies
 * across every tenant at once.
 */

interface PlatformSettingsFormValues {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  auditRetentionDays: string;
  defaultPlanId: string;
}

/** Empty input means "no value" — null on the wire, not an empty string. */
const toNullableText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const PlatformSettingsView = () => {
  const { data, isLoading, isError, refetch } = usePlatformSettings();
  const { data: plansResponse } = usePlans();
  const updateSettings = useUpdatePlatformSettings();

  const settings = data?.data;

  /** Only assignable plans can be a default — retired ones are refused server-side. */
  const assignablePlans = useMemo(
    () => (plansResponse?.data ?? []).filter((plan) => plan.isActive),
    [plansResponse],
  );

  const defaultValues = useMemo<PlatformSettingsFormValues>(
    () => ({
      platformName: settings?.platformName ?? "",
      supportEmail: settings?.supportEmail ?? "",
      supportPhone: settings?.supportPhone ?? "",
      auditRetentionDays:
        settings?.auditRetentionDays === null ||
        settings?.auditRetentionDays === undefined
          ? ""
          : String(settings.auditRetentionDays),
      defaultPlanId: settings?.defaultPlanId ?? "",
    }),
    [settings],
  );

  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<PlatformSettingsFormValues>({ defaultValues });

  // The form mounts before the query resolves, so seed it once data arrives.
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  if (isLoading) return <LoadingState />;

  if (isError || !settings) {
    return (
      <ErrorState
        message="Could not load platform settings"
        onRetry={() => void refetch()}
      />
    );
  }

  const onSubmit = handleSubmit((values) => {
    const retention = values.auditRetentionDays.trim();

    const payload: PlatformSettingsPayload = {
      platformName: values.platformName.trim(),
      supportEmail: toNullableText(values.supportEmail),
      supportPhone: toNullableText(values.supportPhone),
      auditRetentionDays: retention.length ? Number(retention) : null,
      defaultPlanId: values.defaultPlanId || null,
    };

    updateSettings.mutate(payload, {
      // Re-seed from what the server stored, not from what was typed.
      onSuccess: (response) => {
        const saved = response.data;
        if (saved) {
          reset({
            platformName: saved.platformName,
            supportEmail: saved.supportEmail ?? "",
            supportPhone: saved.supportPhone ?? "",
            auditRetentionDays:
              saved.auditRetentionDays === null
                ? ""
                : String(saved.auditRetentionDays),
            defaultPlanId: saved.defaultPlanId ?? "",
          });
        }
      },
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <section className={`${pagePanelClass} space-y-4`}>
        <div>
          <h2 className="text-base font-semibold text-foreground">Branding</h2>
          <p className="text-sm text-muted-foreground">
            Shown in the sidebar and browser title for every tenant.
          </p>
        </div>

        <FormField
          label="Platform name"
          error={errors.platformName?.message}
          required
        >
          <Input
            placeholder="Emvesso CRM"
            {...register("platformName", {
              required: "Platform name is required",
              maxLength: { value: 60, message: "Keep it under 60 characters" },
            })}
          />
        </FormField>
      </section>

      <section className={`${pagePanelClass} space-y-4`}>
        <div>
          <h2 className="text-base font-semibold text-foreground">Support</h2>
          <p className="text-sm text-muted-foreground">
            Shown on the Help page. Leave a field empty to hide that contact
            rather than show one nobody monitors.
          </p>
        </div>

        <FormField label="Support email" error={errors.supportEmail?.message}>
          <Input
            type="email"
            placeholder="support@yourcompany.com"
            {...register("supportEmail", {
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Enter a valid email address",
              },
            })}
          />
        </FormField>

        <FormField label="Support phone" error={errors.supportPhone?.message}>
          <Input placeholder="+91 98765 43210" {...register("supportPhone")} />
        </FormField>
      </section>

      <section className={`${pagePanelClass} space-y-4`}>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Data retention
          </h2>
          <p className="text-sm text-muted-foreground">
            How long audit history is kept before the nightly purge removes it.
          </p>
        </div>

        <FormField
          label="Audit retention (days)"
          error={errors.auditRetentionDays?.message}
          description="Leave empty to keep audit history forever. Minimum 30 days."
        >
          <Input
            type="number"
            min={30}
            max={3650}
            placeholder="Keep forever"
            {...register("auditRetentionDays", {
              validate: (value) => {
                if (!value.trim()) return true;
                const days = Number(value);
                if (!Number.isInteger(days)) return "Enter a whole number";
                if (days < 30) return "Retention must be at least 30 days";
                if (days > 3650) return "Retention cannot exceed 3650 days";
                return true;
              },
            })}
          />
        </FormField>
      </section>

      <section className={`${pagePanelClass} space-y-4`}>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            New organizations
          </h2>
          <p className="text-sm text-muted-foreground">
            The plan a newly created organization starts on.
          </p>
        </div>

        <FormField
          label="Default plan"
          description="Only assignable plans can be a default. Retiring a plan does not move existing subscribers."
        >
          <Controller
            control={control}
            name="defaultPlanId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                placeholder="No default"
                options={assignablePlans.map((plan) => ({
                  value: plan.id,
                  label: plan.name,
                }))}
              />
            )}
          />
        </FormField>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {settings.updatedBy
            ? `Last changed by ${settings.updatedBy.name} on ${new Date(
                settings.updatedAt,
              ).toLocaleString("en-IN")}`
            : "Not changed since setup"}
        </p>

        <Button
          type="submit"
          disabled={!isDirty || updateSettings.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
};

export default PlatformSettingsView;
