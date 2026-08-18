import { BadgeIndianRupee } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import EmptyState from "@/components/common/EmptyState";
import FormHeader from "@/components/common/FormHeader";
import LoadingState from "@/components/common/LoadingState";
import { Card } from "@/components/ui/card";
import {
  PlanForm,
  useCreatePlan,
  usePlans,
  useUpdatePlan,
  type PlanPayload,
} from "@/features/billing";

const BILLING_PLANS_PATH = "/platform/billing?tab=plans";

const SuperAdminPlanFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { data, isLoading } = usePlans({
    includeInactive: true,
    includePrivate: true,
    limit: 100,
  });
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const plans = data?.data ?? [];
  const plan = useMemo(
    () => plans.find((item) => item.id === id) ?? null,
    [plans, id],
  );
  const catalogue = plan?.features ?? plans[0]?.features ?? [];

  const handleCancel = () => navigate(BILLING_PLANS_PATH);

  const handleSubmit = (payload: PlanPayload, planId?: string) => {
    if (planId) {
      const { code: _code, ...rest } = payload;
      updatePlan.mutate(
        { id: planId, payload: rest },
        { onSuccess: handleCancel },
      );
      return;
    }

    createPlan.mutate(payload, { onSuccess: handleCancel });
  };

  if (isEditing && isLoading) {
    return <LoadingState message="Loading plan..." />;
  }

  if (isEditing && !plan) {
    return (
      <EmptyState
        title="Plan not found"
        description="The plan you are trying to edit does not exist."
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-20px)] w-full flex-col overflow-hidden lg:h-[calc(100vh-40px)]">
      <div className="shrink-0">
        <FormHeader
          title={isEditing ? plan?.name ?? "Edit Plan" : "Create Plan"}
          icon={BadgeIndianRupee}
          onBack={handleCancel}
        />
      </div>

      <div className="mt-6 flex-1 overflow-hidden pb-4">
        <Card className="flex h-full flex-col overflow-hidden border-border/60 bg-card shadow-sm">
          <div className="flex h-full flex-col overflow-hidden p-5 sm:p-6 lg:p-8">
            <PlanForm
              plan={plan}
              catalogue={catalogue}
              isSubmitting={createPlan.isPending || updatePlan.isPending}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminPlanFormPage;
