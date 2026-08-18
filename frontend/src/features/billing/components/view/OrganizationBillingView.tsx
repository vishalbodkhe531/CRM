import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import LoadingState from "@/components/common/LoadingState";
import StatusBadge from "@/components/common/StatusBadge";
import { useAppSelector } from "@/hooks/useRedux";
import { useUsage } from "../../hooks/useBilling";
import { usePlans } from "../../hooks/useBilling";
import {
  useAssignInitialPlan,
  useSubscriptionByOrganization,
  useUpdateFeatureOverrides,
} from "../../hooks/useBillingConsole";
import {
  PLAN_INTERVAL_LABELS,
  SUBSCRIPTION_STATUS_BADGE_TYPE,
  SUBSCRIPTION_STATUS_LABELS,
  formatDate,
  formatLimit,
  formatPrice,
} from "../../constants/labels";
import UsageMeter from "../usage/UsageMeter";
import FeatureOverrideDialog from "../form/FeatureOverrideDialog";
import type { FeatureOverridesPayload } from "../../types";

/**
 * Billing tab inside a super-admin organization workspace.
 *
 * Reads the organization from the workspace's selected scope, which the parent
 * sets on mount — so this needs no route params of its own.
 */
const OrganizationBillingView = () => {
  const navigate = useNavigate();
  const organizationId = useAppSelector(
    (s) => s.auth.selectedOrganizationId,
  );

  const { data, isLoading } = useSubscriptionByOrganization(
    organizationId ?? undefined,
  );
  const { data: usageData } = useUsage();
  const { data: plansData } = usePlans({ includeInactive: true, limit: 100 });
  const updateFeatureOverrides = useUpdateFeatureOverrides();
  const assignInitialPlan = useAssignInitialPlan();

  const [editingOverrides, setEditingOverrides] = useState(false);
  const [assignPlanId, setAssignPlanId] = useState("");

  const subscription = data?.data;
  const usage = usageData?.data;
  const plans = plansData?.data ?? [];

  if (isLoading) return <LoadingState message="Loading billing..." />;

  // Repair path: an org with no subscription (created before billing was wired
  // into org creation). Instead of pointing at a script, let the super-admin
  // assign the first plan here — the same action assignInitialPlan exposes.
  if (!subscription) {
    const assignablePlans = plans.filter((plan) => plan.isActive);

    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <h2 className="text-lg font-bold text-foreground">No subscription</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This organization has no plan assigned. Assign one to activate billing
          and enforcement.
        </p>
        <div className="mt-5 space-y-3 text-left">
          <Select
            value={assignPlanId}
            onValueChange={setAssignPlanId}
            placeholder="Select a plan"
            options={assignablePlans.map((plan) => ({
              value: plan.id,
              label: plan.name,
            }))}
          />
          <Button
            className="w-full"
            disabled={!assignPlanId || assignInitialPlan.isPending}
            onClick={() => {
              if (!organizationId || !assignPlanId) return;
              assignInitialPlan.mutate(
                { organizationId, planId: assignPlanId },
                { onSuccess: () => setAssignPlanId("") },
              );
            }}
          >
            {assignInitialPlan.isPending ? "Assigning…" : "Assign plan"}
          </Button>
        </div>
      </Card>
    );
  }

  const { plan } = subscription;
  const seatFeature = subscription.features.find((f) => f.key === "MAX_USERS");
  const customCount = subscription.features.filter(
    (f) => f.origin === "override",
  ).length;

  const handleOverrides = (
    orgId: string,
    payload: FeatureOverridesPayload,
  ) => {
    updateFeatureOverrides.mutate(
      { organizationId: orgId, payload },
      { onSuccess: () => setEditingOverrides(false) },
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">
              {plan.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.priceMinor === 0
                ? "No charge"
                : `${formatPrice(plan.priceMinor, plan.currency)} per ${PLAN_INTERVAL_LABELS[plan.billingCycle]}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <StatusBadge
                status={subscription.effectiveStatus}
                label={
                  SUBSCRIPTION_STATUS_LABELS[subscription.effectiveStatus]
                }
                type={
                  SUBSCRIPTION_STATUS_BADGE_TYPE[subscription.effectiveStatus]
                }
              />
              {subscription.status !== subscription.effectiveStatus && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  set as {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                </p>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() =>
                navigate(`/platform/billing/${subscription.organizationId}/edit`)
              }
            >
              <Pencil className="h-4 w-4" />
              Edit billing
            </Button>

            <Button variant="outline" onClick={() => setEditingOverrides(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              Custom terms
              {customCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {customCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {subscription.reason && (
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-foreground">
            {subscription.reason}
          </p>
        )}

        <dl className="mt-6 grid gap-4 border-t border-border pt-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Seats</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">
              {formatLimit(seatFeature?.valueInt ?? null)}
              {seatFeature?.origin === "override" && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (custom)
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Period ends</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">
              {formatDate(subscription.currentPeriodEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Trial ends</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">
              {formatDate(subscription.trialEndsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Billing email</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {subscription.billingEmail ?? "—"}
            </dd>
          </div>
        </dl>

        {subscription.billingNotes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">Internal notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">
              {subscription.billingNotes}
            </p>
          </div>
        )}
      </Card>

      {usage && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground">Usage</h3>
          <div className="mt-6 space-y-6">
            {usage.metrics.map((metric) => (
              <UsageMeter key={metric.key} metric={metric} />
            ))}
          </div>
        </Card>
      )}

      <FeatureOverrideDialog
        open={editingOverrides}
        onOpenChange={setEditingOverrides}
        subscription={subscription}
        isSubmitting={updateFeatureOverrides.isPending}
        onSubmit={handleOverrides}
      />
    </div>
  );
};

export default OrganizationBillingView;
