import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormDialog from "@/components/common/FormDialog";
import {
  FeatureOverridesFormSchema,
  toNullableNumber,
  type FeatureOverridesFormValues,
} from "@/contracts/validation";
import type { SubscriptionSummary } from "@/contracts/types";
import type { FeatureOverridesPayload } from "../../types";
import FeatureFields from "./FeatureFields";

interface FeatureOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SubscriptionSummary | null;
  isSubmitting: boolean;
  onSubmit: (organizationId: string, payload: FeatureOverridesPayload) => void;
}

/**
 * Per-organization feature overrides — the enterprise-deal escape hatch.
 *
 * Exists so "Professional plan but 200 seats" does not require forking a whole
 * plan, which is how a catalogue fills up with one-customer plans nobody dares
 * edit.
 *
 * Unchecking a row deletes that override and the organization reverts to plan
 * terms. The payload is the complete set, so omission IS deletion.
 */
const FeatureOverrideDialog = ({
  open,
  onOpenChange,
  subscription,
  isSubmitting,
  onSubmit,
}: FeatureOverrideDialogProps) => {
  const catalogue = useMemo(
    () => subscription?.features ?? [],
    [subscription],
  );

  const defaultValues = useMemo<FeatureOverridesFormValues>(
    () => ({
      features: catalogue.map((feature) => ({
        featureKey: feature.key,
        kind: feature.kind,
        // Pre-fill with the CURRENTLY EFFECTIVE value so ticking "Custom" starts
        // from what the customer has today rather than from blank.
        limitValue:
          feature.valueInt === null || feature.valueInt === undefined
            ? ""
            : String(feature.valueInt),
        toggleValue: Boolean(feature.valueBool),
        enabled: feature.origin === "override",
        note: feature.overrideNote ?? "",
      })),
    }),
    [catalogue],
  );

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FeatureOverridesFormValues>({
    resolver: zodResolver(FeatureOverridesFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  if (!subscription) return null;

  const submit = handleSubmit((values) => {
    onSubmit(subscription.organizationId, {
      overrides: values.features
        .filter((feature) => feature.enabled)
        .map((feature) =>
          feature.kind === "limit"
            ? {
                featureKey: feature.featureKey,
                valueInt: toNullableNumber(feature.limitValue),
                note: feature.note || null,
              }
            : {
                featureKey: feature.featureKey,
                valueBool: feature.toggleValue,
                note: feature.note || null,
              },
        ),
    });
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Custom terms — ${subscription.organizationName ?? "Organization"}`}
      description={`Overrides the ${subscription.plan.name} plan for this organization only. Unticked rows follow the plan.`}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      submitLabel="Save custom terms"
      contentClassName="max-w-4xl"
    >
      <FeatureFields
        catalogue={catalogue}
        control={control}
        errors={errors}
        overrideMode
      />
    </FormDialog>
  );
};

export default FeatureOverrideDialog;
