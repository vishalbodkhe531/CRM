import { Router } from "express";
import { prospectController } from "./prospect.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireOrganization } from "../../middlewares/organization.middleware";
import { enforceSubscription } from "../../middlewares/subscription.middleware";
import { validateData } from "../../middlewares/validationMiddleware";
import {
  ConvertLeadToProspectSchema as convertLeadToProspectSchema,
  CreateProspectActivitySchema as createProspectActivitySchema,
  UpdateProspectSchema as updateProspectSchema,
  UpdateProspectFollowUpSchema as updateProspectFollowUpSchema,
  UpdateProspectStageSchema as updateProspectStageSchema,
} from "../../contracts/validation";

const router = Router();

// BASE PATH: /api/prospects
router.use(requireAuth);
router.use(requireOrganization);
// Writes require a live subscription; reads are never blocked. Must come after
// requireAuth, which is what populates req.user.
router.use(enforceSubscription);

router.get(
  "/",
  allowPermission(PERMISSIONS.PROSPECT_READ),
  prospectController.getProspects
);
router.get(
  "/customer-stats",
  allowPermission(PERMISSIONS.PROSPECT_READ),
  prospectController.getCustomerStats
);
router.get(
  "/:id",
  allowPermission(PERMISSIONS.PROSPECT_READ),
  prospectController.getProspectById
);
router.post(
  "/convert",
  allowPermission(PERMISSIONS.PROSPECT_CREATE),
  validateData(convertLeadToProspectSchema),
  // DEPRECATED: UI conversion now happens automatically via PATCH /leads/:id/status.
  // Kept for backward compatibility with external integrations.
  prospectController.convertLeadToProspect,
);
router.patch(
  "/:id",
  allowPermission(PERMISSIONS.PROSPECT_UPDATE),
  validateData(updateProspectSchema),
  prospectController.updateProspect,
);
router.patch(
  "/:id/stage",
  allowPermission(PERMISSIONS.PROSPECT_UPDATE),
  validateData(updateProspectStageSchema),
  prospectController.updateStage,
);
router.patch(
  "/:id/follow-up",
  allowPermission(PERMISSIONS.PROSPECT_UPDATE),
  validateData(updateProspectFollowUpSchema),
  prospectController.updateFollowUp,
);
router.post(
  "/:id/activities",
  allowPermission(PERMISSIONS.PROSPECT_UPDATE),
  validateData(createProspectActivitySchema),
  prospectController.createActivity,
);
router.delete(
  "/:id",
  allowPermission(PERMISSIONS.PROSPECT_DELETE),
  prospectController.deleteProspect
);

export default router;
