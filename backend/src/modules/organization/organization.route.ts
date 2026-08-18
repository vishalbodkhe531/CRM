import express from "express";
import { organizationController } from "./organization.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateData } from "../../middlewares/validationMiddleware";
import {
  CreateOrganizationSchema as createOrganizationSchema,
  UpdateOrganizationSchema as updateOrganizationSchema,
} from "../../contracts/validation";
import { uploadOrganizationAssets } from "../../config/multerConfig";

const router = express.Router();

// Every organization route requires authentication, including the slug lookup:
// unauthenticated it was a tenant-enumeration oracle, turning a guessed slug
// into a real organization id, prefix and status.
router.use(requireAuth);

/**
 * Resolves a URL slug to an organization id for the super-admin workspace.
 * Not public — the service refuses slugs outside the caller's own tenant.
 */
router.get("/by-slug/:slug", organizationController.getOrganizationBySlug);

// Most organization routes will be super_admin only or have specific permissions
// Base check for organization module access could be added if needed,
// but here we check per route or rely on allowPermission below.

// Routes
router.get(
  "/",
  allowPermission(PERMISSIONS.ORG_LIST_GLOBAL),
  organizationController.getAllOrganizations
);

router.post(
  "/",
  allowPermission(PERMISSIONS.ORG_CREATE),
  uploadOrganizationAssets.fields([
    { name: "companyLogo", maxCount: 1 },
    { name: "qrCode", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  validateData(createOrganizationSchema),
  organizationController.createOrganization,
);

router.get(
  "/:id",
  allowPermission(PERMISSIONS.ORG_READ),
  organizationController.getOrganizationById
);

router.patch(
  "/:id",
  allowPermission(PERMISSIONS.ORG_UPDATE),
  uploadOrganizationAssets.fields([
    { name: "companyLogo", maxCount: 1 },
    { name: "qrCode", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  validateData(updateOrganizationSchema),
  organizationController.updateOrganization,
);

router.patch(
  "/:id/status",
  allowPermission(PERMISSIONS.ORG_UPDATE),
  organizationController.updateStatus,
);

// Archive (soft delete). Nothing is physically removed and the slug/prefix
// stay reserved — see organizationService.archiveOrganization.
router.delete(
  "/:id",
  allowPermission(PERMISSIONS.ORG_DELETE),
  organizationController.archiveOrganization,
);

router.patch(
  "/:id/restore",
  allowPermission(PERMISSIONS.ORG_DELETE),
  organizationController.restoreOrganization,
);

router.get(
  "/:id/users",
  allowPermission(PERMISSIONS.USER_READ),
  organizationController.getOrganizationUsers
);

export default router;
