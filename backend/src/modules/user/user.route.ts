  import { Router } from "express";
  import { userController } from "./user.controller";
  import { allowPermission } from "../../middlewares/permission.middleware";
  import { PERMISSIONS } from "../../constants/permissions";
  import { requireAuth } from "../../middlewares/auth.middleware";
  import { requireOrganization } from "../../middlewares/organization.middleware";
  import { enforceSubscription } from "../../middlewares/subscription.middleware";
  import { validateData } from "../../middlewares/validationMiddleware";
  import { CreateUserSchema as createUserSchema, UpdateUserSchema as updateUserSchema } from "../../contracts/validation";
  import { passwordResetLimiter } from "../../middlewares/rateLimiter";

  const router = Router();

  // All user routes require authentication and organization filtering.
  router.use(requireAuth);
  router.use(requireOrganization);
  // Writes require a live subscription; reads are never blocked. Must come after
  // requireAuth, which is what populates req.user.
  router.use(enforceSubscription);

  // Admin can create users in own organization.
  router.post(
    "/",
    allowPermission(PERMISSIONS.USER_CREATE),
    validateData(createUserSchema),
    userController.createUser,
  );

  // super_admin, admin and managers can view users.
  router.get(
    "/",
    allowPermission(PERMISSIONS.USER_READ),
    userController.getAllUsers,
  );

  // Stats endpoint — must be before /:id to avoid Express treating "stats" as a param.
  router.get(
    "/stats",
    allowPermission(PERMISSIONS.USER_READ),
    userController.getStats,
  );

  // Admin and Manager can view specific users in own organization.
  router.get(
    "/:id",
    allowPermission(PERMISSIONS.USER_READ),
    userController.getUserById,
  );

  // Admin and Manager can edit users in own organization.
  router.put(
    "/:id",
    allowPermission(PERMISSIONS.USER_UPDATE),
    validateData(updateUserSchema),
    userController.updateUser,
  );

  // Super admin only — enforced in userService.resetUserPassword, since
  // USER_UPDATE is also held by admins and managers.
  router.post(
    "/:id/reset-password",
    passwordResetLimiter,
    allowPermission(PERMISSIONS.USER_UPDATE),
    userController.resetUserPassword,
  );

  // Admin and Manager can disable users in own organization.
  router.patch(
    "/:id/disable",
    allowPermission(PERMISSIONS.USER_DISABLE),
    userController.disableUser,
  );

  // Admin and Manager can enable users in own organization.
  router.patch(
    "/:id/enable",
    allowPermission(PERMISSIONS.USER_ENABLE),
    userController.enableUser,
  );

  // Admin and Manager can delete users in own organization.
  router.delete(
    "/:id",
    allowPermission(PERMISSIONS.USER_DELETE),
    userController.deleteUser,
  );

  export default router;
