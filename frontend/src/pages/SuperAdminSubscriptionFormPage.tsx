import { CreditCard } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import EmptyState from "@/components/common/EmptyState";
import FormHeader from "@/components/common/FormHeader";
import LoadingState from "@/components/common/LoadingState";
import { Card } from "@/components/ui/card";
import {
  SubscriptionForm,
  usePlans,
  useSubscriptionByOrganization,
  useUpdateSubscription,
  type SubscriptionPayload,
} from "@/features/billing";

const BILLING_SUBSCRIPTIONS_PATH = "/platform/billing?tab=subscriptions";

const SuperAdminSubscriptionFormPage = () => {
  const { id: organizationId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: subscriptionResponse,
    isLoading: isLoadingSubscription,
    error,
  } = useSubscriptionByOrganization(organizationId);
  const { data: plansResponse, isLoading: isLoadingPlans } = usePlans({
    includeInactive: true,
    limit: 100,
  });
  const updateSubscription = useUpdateSubscription();

  const subscription = subscriptionResponse?.data;
  const plans = plansResponse?.data ?? [];
  const handleCancel = () => navigate(BILLING_SUBSCRIPTIONS_PATH);

  const handleSubmit = (
    targetOrganizationId: string,
    payload: SubscriptionPayload,
  ) => {
    updateSubscription.mutate(
      { organizationId: targetOrganizationId, payload },
      { onSuccess: handleCancel },
    );
  };

  if (isLoadingSubscription || isLoadingPlans) {
    return <LoadingState message="Loading billing details..." />;
  }

  if (error || !subscription) {
    return (
      <EmptyState
        title="Billing record not found"
        description="The billing record you are trying to edit does not exist."
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-20px)] w-full flex-col overflow-hidden lg:h-[calc(100vh-40px)]">
      <div className="shrink-0">
        <FormHeader
          title={`Edit Billing - ${subscription.organizationName ?? "Organization"}`}
          icon={CreditCard}
          onBack={handleCancel}
        />
      </div>

      <div className="mt-6 flex-1 overflow-hidden pb-4">
        <Card className="flex h-full flex-col overflow-hidden border-border/60 bg-card shadow-sm">
          <div className="flex h-full flex-col overflow-hidden p-5 sm:p-6 lg:p-8">
            <SubscriptionForm
              subscription={subscription}
              plans={plans}
              isSubmitting={updateSubscription.isPending}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminSubscriptionFormPage;
