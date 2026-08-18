import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeIndianRupee, Save } from "lucide-react";

import FormField from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  PlanFormSchema,
  toNullableNumber,
  toPaise,
  toRupeeInput,
  type PlanFormValues,
} from "@/contracts/validation";
import { PLAN_INTERVALS, type PlanSummary } from "@/contracts/types";
import { PLAN_INTERVAL_LABELS } from "../../constants/labels";
import type { PlanPayload } from "../../types";
import FeatureFields from "./FeatureFields";

interface PlanFormProps {
  plan?: PlanSummary | null;
  catalogue: PlanSummary["features"];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: PlanPayload, id?: string) => void;
}

const PlanForm = ({
  plan,
  catalogue,
  isSubmitting,
  onCancel,
  onSubmit,
}: PlanFormProps) => {
  const isEditing = Boolean(plan);

  const defaultValues = useMemo<PlanFormValues>(() => {
    const features = catalogue.map((feature) => {
      const current = plan?.features.find((item) => item.key === feature.key);
      return {
        featureKey: feature.key,
        kind: feature.kind,
        limitValue:
          current?.valueInt === null || current?.valueInt === undefined
            ? ""
            : String(current.valueInt),
        toggleValue: current?.valueBool ?? Boolean(feature.valueBool),
        note: "",
      };
    });

    if (!plan) {
      return {
        code: "",
        slug: "",
        name: "",
        description: "",
        priceRupees: "0",
        billingCycle: "MONTHLY",
        trialDays: "0",
        isActive: true,
        isPublic: true,
        sortOrder: "0",
        features,
      };
    }

    return {
      code: plan.code,
      slug: plan.slug,
      name: plan.name,
      description: plan.description ?? "",
      priceRupees: toRupeeInput(plan.priceMinor),
      billingCycle: plan.billingCycle,
      trialDays: String(plan.trialDays),
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      sortOrder: String(plan.sortOrder),
      features,
    };
  }, [plan, catalogue]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(PlanFormSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  /**
   * A plan offered to customers with an unlimited enforced limit.
   *
   * Warned about rather than blocked, because an unlimited public plan is
   * occasionally deliberate. It is usually an accident: a blank limit field
   * means unlimited, so filling in only the seat count silently grants
   * everything else without a ceiling. That is how the ₹2,000 plan ended up
   * more generous than the ₹6,000 one on four of five limits.
   */
  const watchedFeatures = watch("features");
  const isPublicPlan = watch("isPublic");

  const uncappedLimits = (watchedFeatures ?? [])
    .map((feature, index) => ({ feature, definition: catalogue[index] }))
    .filter(
      ({ feature, definition }) =>
        feature.kind === "limit" &&
        definition?.enforced &&
        String(feature.limitValue ?? "").trim() === "",
    )
    .map(({ definition }) => definition.label);

  const submit = handleSubmit((values) => {
    onSubmit(
      {
        code: values.code,
        slug: values.slug,
        name: values.name,
        description: values.description || null,
        priceMinor: toPaise(values.priceRupees),
        billingCycle: values.billingCycle,
        trialDays: Number(values.trialDays),
        isActive: values.isActive,
        isPublic: values.isPublic,
        sortOrder: Number(values.sortOrder),
        features: values.features.map((feature) =>
          feature.kind === "limit"
            ? {
                featureKey: feature.featureKey,
                valueInt: toNullableNumber(feature.limitValue),
              }
            : {
                featureKey: feature.featureKey,
                valueBool: feature.toggleValue,
              },
        ),
      },
      plan?.id,
    );
  });

  return (
    <form onSubmit={submit} className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BadgeIndianRupee className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">
            {isEditing ? "Plan Details" : "Plan Creation"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Plan"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-6">
        <fieldset disabled={isSubmitting} className="flex flex-col gap-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              label="Code"
              required
              error={errors.code?.message}
              description={
                isEditing
                  ? "Permanent identifier used by scripts and audit rows."
                  : "Permanent identifier, e.g. PROFESSIONAL."
              }
            >
              <Input
                {...register("code")}
                placeholder="PROFESSIONAL"
                disabled={isEditing}
              />
            </FormField>

            <FormField
              label="Slug"
              required
              error={errors.slug?.message}
              description="Used in URLs and pricing pages."
            >
              <Input {...register("slug")} placeholder="professional" />
            </FormField>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register("name")} placeholder="Professional" />
            </FormField>

            <FormField label="Description" error={errors.description?.message}>
              <Input
                {...register("description")}
                placeholder="For growing sales teams."
              />
            </FormField>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <FormField
              label="Price (Rs.)"
              required
              error={errors.priceRupees?.message}
              description="In rupees. Stored in paise."
            >
              <Input
                {...register("priceRupees")}
                inputMode="decimal"
                placeholder="6000"
              />
            </FormField>

            <FormField label="Billing cycle" error={errors.billingCycle?.message}>
              <Controller
                control={control}
                name="billingCycle"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={PLAN_INTERVALS.map((interval) => ({
                      value: interval,
                      label: `Per ${PLAN_INTERVAL_LABELS[interval]}`,
                    }))}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Trial days"
              error={errors.trialDays?.message}
              description="0 = no trial."
            >
              <Input
                {...register("trialDays")}
                inputMode="numeric"
                placeholder="14"
              />
            </FormField>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <FormField
              label="Assignable"
              layout="horizontal"
              error={errors.isActive?.message}
              description="Off retires the plan. Existing subscribers are unaffected."
            >
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Offered to customers"
              layout="horizontal"
              error={errors.isPublic?.message}
              description="Off keeps it assignable but off the menu."
            >
              <Controller
                control={control}
                name="isPublic"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Sort order"
              error={errors.sortOrder?.message}
              description="Lower appears first."
            >
              <Input
                {...register("sortOrder")}
                inputMode="numeric"
                placeholder="1"
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">
              Limits and features
            </h3>
            <p className="text-xs text-muted-foreground">
              Feature names are fixed in code; their values are yours to set.
            </p>

            {isPublicPlan && uncappedLimits.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                  This plan is offered to customers with no ceiling on{" "}
                  {uncappedLimits.join(", ")}.
                </p>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">
                  A blank limit means unlimited. Check that a dearer plan is not
                  now less generous than this one — if it is, nobody has a reason
                  to upgrade.
                </p>
              </div>
            )}

            <FeatureFields catalogue={catalogue} control={control} errors={errors} />
          </div>
        </fieldset>
      </div>
    </form>
  );
};

export default PlanForm;
