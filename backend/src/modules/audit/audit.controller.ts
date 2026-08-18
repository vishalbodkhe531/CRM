import { Request, Response } from "express";
import { auditService } from "./audit.service";
import { ApiResponse } from "../../utils/response/response";
import { AppError } from "../../utils/errors/appError";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { AuditLogFilterSchema } from "../../contracts/validation";

/**
 * Audit Controller - HTTP boundary for the audit trail.
 *
 * Read-only by design. There is no create/update/delete endpoint: rows are
 * written by auditService.record() from the services that own the action.
 */

// GET /audit-logs - List audit entries (super-admin: all tenants, admin: own org)
const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = AuditLogFilterSchema.parse(req.query);

  if (!req.user) {
    throw AppError.authentication.unauthorized("User not authenticated");
  }

  const result = await auditService.getAuditLogs(query, {
    id: req.user.id,
    role: req.user.role,
    organizationId: req.user.organizationId,
  });

  return ApiResponse.ok(res, result.data, "Audit logs retrieved", result.meta);
});

/**
 * Escape one CSV field.
 *
 * Quotes anything containing a delimiter, quote or newline, and doubles inner
 * quotes — audit rows carry user agents and JSON snapshots, both of which
 * contain commas and quotes routinely.
 *
 * The leading apostrophe on a value starting with = + - or @ defuses CSV
 * injection: Excel and Sheets treat those as formulas, so an actor who set
 * their name to `=HYPERLINK(...)` would otherwise get code execution in the
 * reader's spreadsheet.
 */
const csvField = (value: unknown): string => {
  if (value === null || value === undefined) return "";

  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;

  return /[",\n\r]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
};

const CSV_COLUMNS = [
  "createdAt",
  "action",
  "entityType",
  "entityId",
  "actorEmail",
  "actorRole",
  "actorName",
  "organizationId",
  "organizationName",
  "ipAddress",
  "userAgent",
  "before",
  "after",
] as const;

// GET /audit-logs/export - Same filters as the list, streamed as CSV
const exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = AuditLogFilterSchema.parse(req.query);

  if (!req.user) {
    throw AppError.authentication.unauthorized("User not authenticated");
  }

  const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  /*
   * A BOM, so Excel opens the file as UTF-8. Without it, any non-ASCII name in
   * the trail renders as mojibake — which for an export whose purpose is
   * evidence is worse than it sounds.
   */
  res.write("﻿");
  res.write(`${CSV_COLUMNS.join(",")}\n`);

  const entries = auditService.exportAuditLogs(query, {
    id: req.user.id,
    role: req.user.role,
    organizationId: req.user.organizationId,
  });

  for await (const batch of entries) {
    const chunk = batch
      .map((entry) =>
        [
          entry.createdAt,
          entry.action,
          entry.entityType,
          entry.entityId,
          entry.actor.email,
          entry.actor.role,
          entry.actor.name,
          entry.organizationId,
          entry.organizationName,
          entry.ipAddress,
          entry.userAgent,
          entry.before,
          entry.after,
        ]
          .map(csvField)
          .join(","),
      )
      .join("\n");

    // Backpressure: without this a fast database outruns a slow client and the
    // whole result set buffers in memory, which is what streaming avoids.
    if (!res.write(`${chunk}\n`)) {
      await new Promise((resolve) => res.once("drain", resolve));
    }
  }

  res.end();
});

export const auditController = {
  getAuditLogs,
  exportAuditLogs,
};
