import { Router } from "express";
import { announcementController } from "./announcement.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { requireFeature } from "../../middlewares/feature.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateData } from "../../middlewares/validationMiddleware";
import {
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
} from "../../contracts/validation";

const router = Router();

router.use(requireAuth);

/**
 * There is no requireOrganization here, matching the audit module: a super-admin
 * authors unscoped across tenants and scoping is enforced inside
 * announcementService, which pins every other role to its own organization.
 */

/**
 * ⚠️ Literal paths MUST stay above "/:id".
 *
 * Express matches in declaration order, so a "/:id" route declared first would
 * swallow GET /announcements/feed as id="feed" and return a 404 that looks like
 * a data bug rather than a routing one.
 */

// ---------------------- Viewer surface (any authenticated user) -------------
router.get("/feed", announcementController.getFeed);
router.post("/read-all", announcementController.markAllRead);
router.post("/:id/read", announcementController.markRead);
router.post("/:id/dismiss", announcementController.dismiss);

// ---------------------------- Authoring surface -----------------------------
/**
 * The ANNOUNCEMENTS plan toggle gates authoring only — receiving announcements
 * in the feed above is never gated. Declared here so it applies to every route
 * below and none above. Super-admin is exempt inside requireFeature.
 */
router.use(requireFeature("ANNOUNCEMENTS"));

router.get(
  "/",
  allowPermission(PERMISSIONS.ANNOUNCEMENT_READ),
  announcementController.getAnnouncements,
);

router.post(
  "/",
  allowPermission(PERMISSIONS.ANNOUNCEMENT_CREATE),
  validateData(CreateAnnouncementSchema),
  announcementController.createAnnouncement,
);

router.get(
  "/:id",
  allowPermission(PERMISSIONS.ANNOUNCEMENT_READ),
  announcementController.getAnnouncementById,
);

router.patch(
  "/:id",
  allowPermission(PERMISSIONS.ANNOUNCEMENT_UPDATE),
  validateData(UpdateAnnouncementSchema),
  announcementController.updateAnnouncement,
);

router.post(
  "/:id/publish",
  allowPermission(PERMISSIONS.ANNOUNCEMENT_PUBLISH),
  announcementController.publishAnnouncement,
);

router.post(
  "/:id/archive",
  allowPermission(PERMISSIONS.ANNOUNCEMENT_PUBLISH),
  announcementController.archiveAnnouncement,
);

router.delete(
  "/:id",
  allowPermission(PERMISSIONS.ANNOUNCEMENT_DELETE),
  announcementController.deleteAnnouncement,
);

export default router;
