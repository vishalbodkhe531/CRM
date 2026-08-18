import { useSearchParams } from "react-router-dom";
import PageTabs from "@/components/common/PageTabs";
import SubscriptionsView from "./SubscriptionsView";
import PlansView from "./PlansView";

/**
 * Platform billing console (super-admin).
 *
 * Two jobs that read similarly but are not the same thing: who is on what
 * (Subscriptions), and what is on offer (Plans). The active tab lives in the
 * query string so a link can point at either.
 */

const CONSOLE_TABS = [
  { value: "subscriptions", label: "Subscriptions" },
  { value: "plans", label: "Plans" },
] as const;

type ConsoleTab = (typeof CONSOLE_TABS)[number]["value"];

const BillingConsoleView = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const requested = searchParams.get("tab");
  const activeTab: ConsoleTab = CONSOLE_TABS.some(
    (tab) => tab.value === requested,
  )
    ? (requested as ConsoleTab)
    : "subscriptions";

  return (
    <div className="space-y-6">
      <PageTabs
        tabs={CONSOLE_TABS}
        value={activeTab}
        onValueChange={(value) =>
          setSearchParams({ tab: value }, { replace: true })
        }
      />

      {/*
        Rendered outside the Tabs primitive rather than in TabsContent: each view
        owns a full list screen with its own filters and pagination, and mounting
        both would fire two sets of queries for a panel nobody is looking at.
      */}
      {activeTab === "subscriptions" ? <SubscriptionsView /> : <PlansView />}
    </div>
  );
};

export default BillingConsoleView;
