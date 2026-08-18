import { Router } from "express";
import { quotationController } from "./quotation.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireOrganization } from "../../middlewares/organization.middleware";
import { enforceSubscription } from "../../middlewares/subscription.middleware";
import { validateData } from "../../middlewares/validationMiddleware";
import {
  CreateQuotationSchema,
  UpdateQuotationSchema,
} from "../../contracts/validation";

const router = Router();

// All quotation routes require authentication and organization filtering
router.use(requireAuth);
router.use(requireOrganization);
// Writes require a live subscription; reads are never blocked. Must come after
// requireAuth, which is what populates req.user.
router.use(enforceSubscription);

router.post(
  "/",
  allowPermission(PERMISSIONS.QUOTATION_CREATE),
  validateData(CreateQuotationSchema),
  quotationController.createQuotation,
);

router.get(
  "/",
  allowPermission(PERMISSIONS.QUOTATION_READ),
  quotationController.getQuotations,
);

router.get(
  "/stats",
  allowPermission(PERMISSIONS.QUOTATION_READ),
  quotationController.getQuotationStats,
);

router.get(
  "/:id",
  allowPermission(PERMISSIONS.QUOTATION_READ),
  quotationController.getQuotationById,
);

router.patch(
  "/:id",
  allowPermission(PERMISSIONS.QUOTATION_UPDATE),
  validateData(UpdateQuotationSchema),
  quotationController.updateQuotation,
);

router.delete(
  "/:id",
  allowPermission(PERMISSIONS.QUOTATION_DELETE),
  quotationController.deleteQuotation,
);

export default router;
