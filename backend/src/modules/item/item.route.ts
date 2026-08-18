import { Router } from "express";
import { itemController } from "./item.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireOrganization } from "../../middlewares/organization.middleware";
import { enforceSubscription } from "../../middlewares/subscription.middleware";
import { validateData } from "../../middlewares/validationMiddleware";
import {
  CreateItemSchema as createItemSchema,
  UpdateItemSchema as updateItemSchema,
} from "../../contracts/validation";

const router = Router();

// All item routes require authentication and organization filtering
router.use(requireAuth);
router.use(requireOrganization);
// Writes require a live subscription; reads are never blocked. Must come after
// requireAuth, which is what populates req.user.
router.use(enforceSubscription);

router.post(
  '/',
  allowPermission(PERMISSIONS.ITEM_CREATE),
  validateData(createItemSchema),
  itemController.createItem,
);

router.get(
  '/stats',
  allowPermission(PERMISSIONS.ITEM_READ),
  itemController.getStats,
);

router.get(
  '/',
  allowPermission(PERMISSIONS.ITEM_READ),
  itemController.getItems,
);

router.get(
  '/:id',
  allowPermission(PERMISSIONS.ITEM_READ),
  itemController.getItemById,
);

router.patch(
  '/:id',
  allowPermission(PERMISSIONS.ITEM_UPDATE),
  validateData(updateItemSchema),
  itemController.updateItem,
);

router.patch(
  '/:id/toggle-status',
  allowPermission(PERMISSIONS.ITEM_UPDATE),
  itemController.toggleItemStatus,
);

router.delete(
  '/:id',
  allowPermission(PERMISSIONS.ITEM_DELETE),
  itemController.deleteItem,
);

export default router;
