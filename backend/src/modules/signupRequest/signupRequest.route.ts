import { NextFunction, Request, Response, Router } from "express";
import { Role } from "@prisma/client";
import { signupRequestController } from "./signupRequest.controller";
import { validateData } from "../../middlewares/validationMiddleware";
import { requireAuth } from "../../middlewares/auth.middleware";
import { authLimiter } from "../../middlewares/rateLimiter";
import { SignupRequestSchema } from "../../contracts/validation";
import { AppError } from "../../utils/errors/appError";

const publicRouter = Router();
const adminRouter = Router();

const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    throw AppError.authentication.required();
  }

  if (req.user.role !== Role.SUPER_ADMIN) {
    throw AppError.authorization.roleRequired("SUPER_ADMIN");
  }

  next();
};

publicRouter.post(
  "/",
  authLimiter,
  validateData(SignupRequestSchema),
  signupRequestController.submitSignupRequest,
);

adminRouter.use(requireAuth, requireSuperAdmin);
adminRouter.get("/", signupRequestController.listSignupRequests);
adminRouter.get("/:id", signupRequestController.getSignupRequest);
adminRouter.patch("/:id/status", signupRequestController.updateSignupRequestStatus);

export const signupRequestRoutes = {
  publicRouter,
  adminRouter,
};
