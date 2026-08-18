import type { Prospect } from "@/contracts/types";
import StatusBadge from "./StatusBadge";

const getFollowUpAt = (prospect: Prospect) => {
  if (!prospect.followUp?.date) return null;

  const followUpAt = new Date(prospect.followUp.date);

  if (prospect.followUp.time) {
    const [hours, minutes] = prospect.followUp.time.split(":").map(Number);
    followUpAt.setHours(hours, minutes, 0, 0);
  }

  return followUpAt;
};

const getOverdueLabel = (prospect: Prospect): string => {
  const followUpAt = getFollowUpAt(prospect);
  if (!followUpAt) return "Overdue";

  const diffMs = Date.now() - followUpAt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) return `${diffDays}d overdue`;
  if (diffHours >= 1) return `${diffHours}h overdue`;
  return `${diffMinutes}m overdue`;
};

const getWarningLabel = (prospect: Prospect): string => {
  const followUpAt = getFollowUpAt(prospect);
  if (!followUpAt) return "Due soon";

  const now = Date.now();
  if (now > followUpAt.getTime()) {
    const diffMs = now - followUpAt.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `Due ${diffMinutes}m ago`;
  }

  const diffMs = followUpAt.getTime() - now;
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffHours >= 1) return `Due in ${diffHours}h`;
  return `Due in ${diffMinutes}m`;
};

export const FollowUpHealthBadge = ({ prospect }: { prospect: Prospect }) => {
  switch (prospect.followUpHealth) {
    case "OVERDUE":
      return (
        <StatusBadge
          status="OVERDUE"
          label={getOverdueLabel(prospect)}
          type="error"
        />
      );
    case "WARNING":
      return (
        <StatusBadge
          status="WARNING"
          label={getWarningLabel(prospect)}
          type="warning"
        />
      );
    case "OK":
      return (
        <StatusBadge
          status="OK"
          label={
            prospect.followUp?.date
              ? `Due ${new Date(prospect.followUp.date).toLocaleDateString("en-IN")}`
              : "Scheduled"
          }
          type="success"
        />
      );
    default:
      return <StatusBadge status="NONE" label="No follow-up" type="inactive" />;
  }
};

export default FollowUpHealthBadge;
