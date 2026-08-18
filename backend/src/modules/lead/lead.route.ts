import { Router } from "express";
import { leadController } from "./lead.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireOrganization } from "../../middlewares/organization.middleware";
import { enforceSubscription } from "../../middlewares/subscription.middleware";
import { validateData } from "../../middlewares/validationMiddleware";
import {
  AssignLeadSchema as assignLeadSchema,
  CreateLeadSchema as createLeadSchema,
  ConvertLeadToProspectFromLeadSchema as convertLeadToProspectFromLeadSchema,
  UpdateLeadSchema as updateLeadSchema,
  UpdateLeadStatusSchema as updateLeadStatusSchema,
} from "../../contracts/validation";
import {
  uploadLeadImportFile,
  uploadLeadProfilePicture,
} from "../../config/multerConfig";

const router = Router();

// All lead routes require authentication and organization filtering
router.use(requireAuth);
router.use(requireOrganization);
// Writes require a live subscription; reads are never blocked. Must come after
// requireAuth, which is what populates req.user.
router.use(enforceSubscription);

// POST /leads  — multer FIRST so req.body is parsed before Zod validation
router.post(
  "/",
  allowPermission(PERMISSIONS.LEAD_CREATE),
  uploadLeadProfilePicture.single("profilePicture"), // multer parses multipart body
  validateData(createLeadSchema),               // Zod runs AFTER body is available
  leadController.createLead,
);

router.post(
  "/import",
  allowPermission(PERMISSIONS.LEAD_CREATE),
  uploadLeadImportFile.single("file"),
  leadController.importLeads
);

router.get(
  "/assignable-users",
  allowPermission(PERMISSIONS.LEAD_READ),
  leadController.getAssignableUsers
);

router.get(
  "/",
  allowPermission(PERMISSIONS.LEAD_READ),
  leadController.getLeads
);

router.get(
  "/:id",
  allowPermission(PERMISSIONS.LEAD_READ),
  leadController.getLeadById
);

// PATCH /:id  — multer FIRST so req.body is parsed before Zod validation
router.patch(
  "/:id",
  allowPermission(PERMISSIONS.LEAD_UPDATE),
  uploadLeadProfilePicture.single("profilePicture"), // multer parses multipart body
  validateData(updateLeadSchema),                // Zod runs AFTER body is available
  leadController.updateLead,
);

router.patch(
  "/:id/status",
  allowPermission(PERMISSIONS.LEAD_UPDATE),
  validateData(updateLeadStatusSchema),
  leadController.updateLeadStatus,
);

router.delete(
  "/:id",
  allowPermission(PERMISSIONS.LEAD_DELETE),
  leadController.softDeleteLead,
);

router.post(
  "/:id/convert",
  allowPermission(PERMISSIONS.LEAD_UPDATE),
  validateData(convertLeadToProspectFromLeadSchema),
  // DEPRECATED: Conversion now happens automatically via PATCH /:id/status.
  // Kept for backward compatibility with external integrations.
  leadController.convertLeadToProspect,
);

router.patch(
  "/:id/assign",
  allowPermission(PERMISSIONS.LEAD_UPDATE),
  validateData(assignLeadSchema),
  leadController.assignLead,
);

export default router;
