import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireOrganization } from "../../middlewares/organization.middleware";
import { allowPermission } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { reportsController } from "./reports.controller";

const router = Router();

// All reports routes require authentication and organization context
router.use(requireAuth);
router.use(requireOrganization);

// Gate report endpoint with reports:read permission
router.use(allowPermission(PERMISSIONS.REPORTS_READ));

router.get("/", reportsController.getReports);

export default router;
