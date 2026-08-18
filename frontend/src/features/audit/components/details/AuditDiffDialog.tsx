import { Fragment } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DialogShell from "@/components/common/DialogShell";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/utils/cn";
import type { AuditLogEntry, AuditSnapshot } from "@/contracts/types";
import {
  AUDIT_ACTION_BADGE_TYPE,
  AUDIT_ACTION_LABELS,
  AUDIT_FIELD_LABELS,
} from "../../constants/labels";

interface AuditDiffDialogProps {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  // Objects and arrays would stringify to "[object Object]"; show readable JSON.
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const fieldLabel = (key: string) => AUDIT_FIELD_LABELS[key] ?? key;

/** Union of keys across both snapshots so added and removed fields both show. */
const collectKeys = (before: AuditSnapshot, after: AuditSnapshot) =>
  Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  );

const AuditDiffDialog = ({
  entry,
  open,
  onOpenChange,
}: AuditDiffDialogProps) => {
  if (!entry) return null;

  const keys = collectKeys(entry.before, entry.after);
  const hasBefore = Boolean(entry.before);
  const hasAfter = Boolean(entry.after);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogShell
        title={AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
        description={`${entry.actor.name ?? entry.actor.email} · ${new Date(
          entry.createdAt,
        ).toLocaleString("en-IN")}`}
        leadingIcon={
          <StatusBadge
            status={entry.action}
            label={AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
            type={AUDIT_ACTION_BADGE_TYPE[entry.action]}
          />
        }
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-[30px] px-6"
          >
            Close
          </Button>
        }
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <dt className="text-xs font-semibold text-muted-foreground">
              Actor
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {entry.actor.name ?? "—"}
            </dd>
            <dd className="text-xs text-muted-foreground">
              {entry.actor.email} · {entry.actor.role}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <dt className="text-xs font-semibold text-muted-foreground">
              Organization
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {entry.organizationName ?? "Platform"}
            </dd>
            <dd className="text-xs text-muted-foreground">
              IP {entry.ipAddress ?? "—"}
            </dd>
            {entry.userAgent && (
              <dd className="mt-1 truncate text-[11px] text-muted-foreground" title={entry.userAgent}>
                {entry.userAgent}
              </dd>
            )}
          </div>
        </dl>

        {keys.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-border text-xs font-semibold text-muted-foreground">
              <div className="bg-muted/40 px-3 py-2">Field</div>
              <div className="bg-muted/40 px-3 py-2">Before</div>
              <div className="bg-muted/40 px-3 py-2">After</div>
            </div>
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-border">
              {keys.map((key) => {
                const beforeValue = entry.before?.[key];
                const afterValue = entry.after?.[key];
                const changed =
                  hasBefore &&
                  hasAfter &&
                  formatValue(beforeValue) !== formatValue(afterValue);

                return (
                  <Fragment key={key}>
                    <div className="bg-card px-3 py-2 text-sm font-medium text-foreground">
                      {fieldLabel(key)}
                    </div>
                    <div
                      className={cn(
                        "bg-card px-3 py-2 text-sm text-muted-foreground",
                        changed && "text-destructive",
                      )}
                    >
                      {hasBefore ? formatValue(beforeValue) : "—"}
                    </div>
                    <div
                      className={cn(
                        "bg-card px-3 py-2 text-sm text-muted-foreground",
                        changed && "font-semibold text-foreground",
                      )}
                    >
                      {hasAfter ? formatValue(afterValue) : "—"}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No field-level detail was captured for this action.
          </p>
        )}
      </DialogShell>
    </Dialog>
  );
};

export default AuditDiffDialog;
