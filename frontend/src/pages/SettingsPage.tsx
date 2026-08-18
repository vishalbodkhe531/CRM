import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import PageTabs from "@/components/common/PageTabs";
import { BillingView } from "@/features/billing";

/**
 * Organization settings.
 *
 * The active tab lives in the query string so a banner, an email or a support
 * agent can deep-link straight to billing — landing on a generic settings page
 * when you were sent to fix a payment is a dead end.
 */

const SETTINGS_TABS = [{ value: "billing", label: "Billing" }] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

const DEFAULT_TAB: SettingsTab = "billing";

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const requested = searchParams.get("tab");
  const activeTab: SettingsTab = SETTINGS_TABS.some(
    (tab) => tab.value === requested,
  )
    ? (requested as SettingsTab)
    : DEFAULT_TAB;

  const handleTabChange = (value: string) => {
    // replace, not push: flipping tabs should not fill the user's back button.
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your organization's plan and preferences"
      />

      <PageTabs
        tabs={SETTINGS_TABS}
        value={activeTab}
        onValueChange={handleTabChange}
      />

      <div className="mt-6">
        {activeTab === "billing" && <BillingView />}
      </div>
    </div>
  );
};

export default SettingsPage;
