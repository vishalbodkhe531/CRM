import PageHeader from "@/components/common/PageHeader";
import { PlatformSettingsView } from "@/features/platformSettings";

/**
 * Super-admin platform configuration.
 *
 * Separate from /settings, which is a tenant's own organization preferences. A
 * super-admin has no organization, so that page could only ever show them "No
 * organization selected" — this is where their settings actually live.
 */
const PlatformSettingsPage = () => (
  <div className="w-full space-y-6">
    <PageHeader
      title="Platform Settings"
      description="Configuration that applies across every organization"
    />

    <PlatformSettingsView />
  </div>
);

export default PlatformSettingsPage;
