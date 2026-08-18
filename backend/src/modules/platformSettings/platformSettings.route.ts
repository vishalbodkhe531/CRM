import { Router } from "express";
import { platformSettingsController } from "./platformSettings.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateData } from "../../middlewares/validationMiddleware";
import { UpdatePlatformSettingsSchema } from "../../contracts/validation";

const router = Router();

router.use(requireAuth);

/**
 * A platform surface: there is deliberately no requireOrganization here. These
 * settings belong to the installation, not to a tenant, so scoping them to one
 * would be meaningless.
 */

/**
 * Product name and support contacts, for the sidebar and the Help page.
 * Readable by every signed-in user — those two screens exist for tenants too.
 * Declared before "/" so the literal path cannot be shadowed.
 */
router.get("/public", platformSettingsController.getPublicSettings);

router.get(
  "/",
  allowPermission(PERMISSIONS.PLATFORM_MANAGE),
  platformSettingsController.getSettings,
);

router.patch(
  "/",
  allowPermission(PERMISSIONS.PLATFORM_MANAGE),
  validateData(UpdatePlatformSettingsSchema),
  platformSettingsController.updateSettings,
);

export default router;
