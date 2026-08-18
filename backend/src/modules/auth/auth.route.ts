import { Router } from "express";
import { authController } from "./auth.controller";
import { validateData } from "../../middlewares/validationMiddleware";
import {
  LoginSchema,
  SignupSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "../../contracts/validation";
import { requireAuth } from "../../middlewares/auth.middleware";
import {
  authLimiter,
  passwordResetLimiter,
  passwordResetTokenLimiter,
  refreshLimiter,
} from "../../middlewares/rateLimiter";
import { uploadAuthProfileAssets } from "../../config/multerConfig";

const router = Router();

router.post(
  "/signup",
  authLimiter,
  validateData(SignupSchema),
  authController.signup,
);
router.post(
  "/login",
  authLimiter,
  validateData(LoginSchema),
  authController.login,
);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.post(
  "/forgot-password/generate-otp",
  passwordResetLimiter,
  validateData(ForgotPasswordSchema),
  authController.generatePasswordResetOtp,
);
router.post(
  "/forgot-password/reset",
  passwordResetTokenLimiter,
  validateData(ResetPasswordSchema),
  authController.resetPasswordWithOtp,
);
router.get("/me", requireAuth, authController.getMe);
router.patch(
  "/profile",
  requireAuth,
  uploadAuthProfileAssets.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "companyLogo", maxCount: 1 },
    { name: "qrCode", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  validateData(UpdateProfileSchema),
  authController.updateProfile,
);
router.post(
  "/change-password",
  requireAuth,
  validateData(ChangePasswordSchema),
  authController.changePassword,
);

export default router;
