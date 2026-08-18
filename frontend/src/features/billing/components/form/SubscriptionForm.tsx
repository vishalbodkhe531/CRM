import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Save } from "lucide-react";

import FormField from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  SubscriptionFormSchema,
  fromDateInput,
  toDateInput,
  type SubscriptionFormValues,
} from "@/contracts/validation";
import {
  SUBSCRIPTION_STATUSES,
  type PlanSummary,
  type SubscriptionSummary,
} from "@/contracts/types";
import {
  SUBSCRIPTION_STATUS_LABELS,
  formatLimit,
  formatPrice,
} from "../../constants/labels";
import type { SubscriptionPayload } from "../../types";

interface SubscriptionFormProps {
  subscription: SubscriptionSummary;
  plans: PlanSummary[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (organizationId: string, payload: SubscriptionPayload) => void;
}

const SubscriptionForm = ({
  subscription,
  plans,
  isSubmitting,
  onCancel,
  onSubmit,
}: SubscriptionFormProps) => {
  const defaultValues = useMemo<SubscriptionFormValues>(
    () => ({
      planId: subscription.plan.id,
      status: subscription.status,
      trialEndsAt: toDateInput(subscription.trialEndsAt),
      currentPeriodStart: toDateInput(subscription.currentPeriodStart),
      currentPeriodEnd: toDateInput(subscription.currentPeriodEnd),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      billingEmail: subscription.billingEmail ?? "",
      billingNotes: subscription.billingNotes ?? "",
    }),
    [subscription],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(SubscriptionFormSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const planOptions = plans
    .filter((plan) => plan.isActive || plan.id === subscription.plan.id)
    .map((plan) => {
      const seats = plan.features.find((feature) => feature.key === "MAX_USERS");
      return {
        value: plan.id,
        label: `${plan.name} - ${formatPrice(
          plan.priceMinor,
          plan.currency,
        )} - ${formatLimit(seats?.valueInt ?? null)} seats${
          plan.isActive ? "" : " (retired)"
        }`,
      };
    });

  const submit = handleSubmit((values) => {
    onSubmit(subscription.organizationId, {
      planId: values.planId,
      status: values.status,
      trialEndsAt: fromDateInput(values.trialEndsAt),
      currentPeriodStart: fromDateInput(values.currentPeriodStart) ?? undefined,
      currentPeriodEnd: fromDateInput(values.currentPeriodEnd),
      cancelAtPeriodEnd: values.cancelAtPeriodEnd,
      billingEmail: values.billingEmail || null,
      billingNotes: values.billingNotes || null,
    });
  });

  return (
    <form onSubmit={submit} className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <CreditCard className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="truncate text-base font-bold text-foreground">
            Billing - {subscription.organizationName ?? "Organization"}
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
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-6">
        <fieldset disabled={isSubmitting} className="flex flex-col gap-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Plan" required error={errors.planId?.message}>
              <Controller
                control={control}
                name="planId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={planOptions}
                    placeholder="Select a plan"
                  />
                )}
              />
            </FormField>

            <FormField
              label="Status"
              error={errors.status?.message}
              description="What the clock says still wins if dates have lapsed."
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={SUBSCRIPTION_STATUSES.map((status) => ({
                      value: status,
                      label: SUBSCRIPTION_STATUS_LABELS[status],
                    }))}
                  />
                )}
              />
            </FormField>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <FormField
              label="Period starts"
              error={errors.currentPeriodStart?.message}
            >
              <Input type="date" {...register("currentPeriodStart")} />
            </FormField>

            <FormField
              label="Period ends"
              error={errors.currentPeriodEnd?.message}
              description="Blank = never expires."
            >
              <Input type="date" {...register("currentPeriodEnd")} />
            </FormField>

            <FormField
              label="Trial ends"
              error={errors.trialEndsAt?.message}
              description="Only used while status is Trial."
            >
              <Input type="date" {...register("trialEndsAt")} />
            </FormField>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Billing email" error={errors.billingEmail?.message}>
              <Input
                {...register("billingEmail")}
                type="email"
                placeholder="accounts@example.com"
              />
            </FormField>

            <FormField
              label="Do not renew"
              layout="horizontal"
              error={errors.cancelAtPeriodEnd?.message}
              description="Access continues until the period ends."
            >
              <Controller
                control={control}
                name="cancelAtPeriodEnd"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField
            label="Internal notes"
            error={errors.billingNotes?.message}
            description="Not shown to the customer. Useful for payment references."
          >
            <textarea
              {...register("billingNotes")}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Paid by NEFT ref 12345 on 12 Jul"
            />
          </FormField>
        </fieldset>
      </div>
    </form>
  );
};

export default SubscriptionForm;
