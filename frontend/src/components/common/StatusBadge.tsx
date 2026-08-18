import { cn } from "@/utils/cn";

export type StatusType =
  | "success"
  | "inactive"
  | "error"
  | "pending"
  | "warning"
  | "orange";

interface StatusBadgeProps {
  status: string;
  label?: string;
  type?: StatusType;
  className?: string;
  showDot?: boolean;
}

const statusStyles: Record<StatusType, string> = {
  success:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  inactive:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-border dark:border-gray-700",
  error:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  warning:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  pending:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  orange:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
};

const dotStyles: Record<StatusType, string> = {
  success: "bg-green-500",
  inactive: "bg-gray-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
  pending: "bg-blue-500",
  orange: "bg-orange-500",
};

/**
 * Infers UI style type from raw UPPERCASE status enums.
 * NO lowercase transformation allowed.
 */
const inferTypeFromStatus = (status: string): StatusType => {
  // Success / Active
  if (
    [
      "ACTIVE",
      "SUCCESS",
      "COMPLETED",
      "VERIFIED",
      "INTERESTED",
      "CONVERTED",
      "WON",
    ].includes(status)
  ) {
    return "success";
  }

  // Inactive / Disabled
  if (["INACTIVE", "DISABLED", "ARCHIVED", "SUSPENDED"].includes(status)) {
    return "inactive";
  }

  // Error / Rejected
  if (
    [
      "ERROR",
      "FAILED",
      "REJECTED",
      "CANCELLED",
      "LOST",
      "UNQUALIFIED",
    ].includes(status)
  ) {
    return "error";
  }

  // Pending / In-Progress
  if (
    [
      "PENDING",
      "PROCESSING",
      "IN_PROGRESS",
      "CONTACTED",
      "PROSPECT",
      "NEW",
      "ATTEMPTED_CONTACT",
      "REQUIREMENT",
      "FOLLOW_UP",
      "DEMO",
      "PROPOSAL",
      "NEGOTIATION",
    ].includes(status)
  ) {
    return "pending";
  }

  // Warning / Attention
  if (
    ["WARNING", "ATTENTION", "ON_HOLD", "FOLLOW_UP_PENDING"].includes(status)
  ) {
    return "warning";
  }

  if (status === "NOT_INTERESTED") {
    return "orange";
  }

  return "inactive";
};

/**
 * StatusBadge Component
 * Accepts raw UPPERCASE enums and displays them using label mapping (via parent) or
 * default formatting (via replace).
 */
const StatusBadge = ({
  status,
  label,
  type,
  className,
  showDot = false,
}: StatusBadgeProps) => {
  const resolvedType = type || inferTypeFromStatus(status);
  const style = statusStyles[resolvedType] || statusStyles.inactive;
  const dotStyle = dotStyles[resolvedType] || dotStyles.inactive;

  // Pretty display: replace underscores with spaces and capitalize words
  const displayLabel =
    label ||
    status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        style,
        className,
      )}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotStyle)}
          aria-hidden="true"
        />
      )}
      <span className="sr-only">Status: </span>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
