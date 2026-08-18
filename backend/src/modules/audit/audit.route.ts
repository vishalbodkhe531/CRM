import { Router } from "express";
import { auditController } from "./audit.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { requireFeature } from "../../middlewares/feature.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);

/**
 * Append-only: read routes only.
 *
 * Note there is no requireOrganization here — super-admin must read unscoped
 * across tenants. Org scoping is enforced in auditService.getAuditLogs, which
 * pins every non-super-admin to its own organizationId.
 */
/**
 * Declared before "/" so the literal path cannot be shadowed. Same permission,
 * same feature gate and the same visibility rules as the list — the export is a
 * different response format, not a different level of access.
 */
router.get(
  "/export",
  allowPermission(PERMISSIONS.AUDIT_READ),
  requireFeature("AUDIT_LOG_ACCESS"),
  auditController.exportAuditLogs,
);

router.get(
  "/",
  allowPermission(PERMISSIONS.AUDIT_READ),
  // The AUDIT_LOG_ACCESS plan toggle gates a tenant's view of its own trail.
  // Super-admin is exempt inside requireFeature.
  requireFeature("AUDIT_LOG_ACCESS"),
  auditController.getAuditLogs,
);

export default router;
