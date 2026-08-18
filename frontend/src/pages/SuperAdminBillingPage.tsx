import PageHeader from "@/components/common/PageHeader";
import { BillingConsoleView } from "@/features/billing";

const SuperAdminBillingPage = () => {
  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Billing"
        description="Plans and subscriptions across every organization"
      />
      <BillingConsoleView />
    </div>
  );
};

export default SuperAdminBillingPage;
