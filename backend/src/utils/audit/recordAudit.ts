import type { Request } from "express";
import { auditService } from "../../modules/audit/audit.service";
import type { RecordAuditInput } from "../../contracts/types";

type RequestAuditInput = Omit<
  RecordAuditInput,
  "actor" | "ipAddress" | "userAgent"
> & {
  /**
   * Override the acting identity. Needed for events where there is no
   * authenticated user yet — a failed login knows the attempted email only.
   */
  actor?: RecordAuditInput["actor"];
};

/**
 * Record an audit row using the request for actor, IP and user-agent.
 *
 * Call this from controllers, after the service call has returned — services
 * must not import other services, and an audit write must never sit inside the
 * business transaction. Safe to await: auditService.record never throws.
 */
export const recordAudit = (req: Request, input: RequestAuditInput) => {
  const actor =
    input.actor ??
    (req.user
      ? {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role as string,
        }
      : { id: null, email: "unknown", role: "UNKNOWN" });

  return auditService.record({
    ...input,
    actor,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  });
};
