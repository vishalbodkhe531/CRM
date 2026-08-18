import { Link } from "react-router-dom";
import NoticeBanner from "@/components/common/NoticeBanner";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import { useSubscriptionStatus } from "../../hooks/useBilling";
import {
  SUBSCRIPTION_BANNER_SEVERITY,
  SUBSCRIPTION_STATUS_LABELS,
} from "../../constants/labels";

/**
 * Persistent subscription warning.
 *
 * Uses the shared NoticeBanner, so announcements and billing render as one
 * banner style rather than two competing strips.
 *
 * Deliberately NOT dismissible: an expiring subscription is not something the
 * user should be able to make disappear, and unlike an announcement there is no
 * per-user receipt to remember a dismissal in anyway.
 */
const SubscriptionBanner = () => {
  const user = useAppSelector((s) => s.auth.user);
  // Status endpoint is readable by every tenant role, so managers/executives now
  // see the same warning that drives their blocked writes — not only admins.
  const { data } = useSubscriptionStatus();
  const status = data?.data;

  // Nothing to say, or the account is simply healthy.
  if (!status?.isWarning || !status.effectiveStatus || !status.reason) {
    return null;
  }

  const { effectiveStatus, reason } = status;

  // Only roles that can actually do something about it get the call to action.
  const canReachBilling =
    user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN;

  /**
   * Each role gets the billing surface it can actually act on. Sending a
   * super-admin to /settings landed them on a tenant billing tab with no tenant
   * selected — a dead end reached by clicking the one button offered.
   */
  const billingHref =
    user?.role === ROLES.SUPER_ADMIN
      ? "/platform/billing"
      : "/settings";

  return (
    <NoticeBanner
      severity={SUBSCRIPTION_BANNER_SEVERITY[effectiveStatus]}
      title={SUBSCRIPTION_STATUS_LABELS[effectiveStatus]}
      body={reason}
      action={
        canReachBilling ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shrink-0 bg-transparent"
          >
            <Link to={billingHref}>View billing</Link>
          </Button>
        ) : undefined
      }
    />
  );
};

export default SubscriptionBanner;
