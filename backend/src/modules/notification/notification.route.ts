import { Router } from "express";
import { notificationController } from "./notification.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);

/**
 * No permission checks and no requireOrganization: every route reads or writes
 * the CALLER's own notifications, scoped by userId inside the repository. There
 * is nothing here another role could need to be granted.
 *
 * enforceSubscription is not mounted either — a lapsed tenant must still be able
 * to read the notification telling them their subscription lapsed.
 *
 * ⚠️ "/read-all" must stay above "/:id/read" — Express matches in declaration
 * order, and a parameterised route declared first would swallow it.
 */
router.get("/", notificationController.getFeed);
router.patch("/read-all", notificationController.markAllRead);
router.patch("/:id/read", notificationController.markRead);
router.delete("/:id", notificationController.remove);

export default router;
