import { Request, Response } from "express";
import { organizationService } from "./organization.service";
import { ApiResponse } from "../../utils/response/response";
import { AppError } from "../../utils/errors/appError";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { logger } from "../../config/logger";
import { recordAudit } from "../../utils/audit/recordAudit";
import { pickFields } from "../audit/audit.service";
import { deleteStoredAsset, toPublicUploadPath } from "../../utils/uploads/assetFiles";
import { billingRepository } from "../billing/billing.repository";
import { dashboardService } from "../dashboard/dashboard.service";
import {
  ORGANIZATION_STATUS_VALUES,
} from "../../contracts/constants";
import {
  CreateOrganizationSchema,
  OrganizationFilterSchema,
  OrganizationSlugParamSchema,
  UpdateOrganizationSchema,
} from "../../contracts/validation";

/**
 * Organization Controller - HTTP Boundary for Organization Management
 */

/** Whitelisted organization fields captured in audit snapshots. */
const AUDITED_ORG_FIELDS = [
  "id",
  "name",
  "slug",
  "prefix",
  "status",
  "orgType",
  "email",
  "mobile",
  "gstin",
  "address",
  "authorizedPerson",
] as const;

const ORGANIZATION_ASSET_FIELDS = [
  "companyLogo",
  "qrCode",
  "signature",
] as const;

type OrganizationAssetField = (typeof ORGANIZATION_ASSET_FIELDS)[number];

const getUploadedOrganizationAssets = (req: Request) => {
  const files = req.files as
    | Partial<Record<OrganizationAssetField, Express.Multer.File[]>>
    | undefined;

  // The URL comes from where multer actually wrote the file, so this cannot
  // drift from the folder layout configured in multerConfig.
  return ORGANIZATION_ASSET_FIELDS.reduce(
    (assets, fieldName) => {
      const file = files?.[fieldName]?.[0];
      if (file) {
        assets[fieldName] = toPublicUploadPath(file);
      }
      return assets;
    },
    {} as Partial<Record<OrganizationAssetField, string>>,
  );
};

// GET /admin/organizations - List all organizations (super_admin only)
const getAllOrganizations = asyncHandler(
  async (req: Request, res: Response) => {
    const query = OrganizationFilterSchema.parse(req.query);

    const result = await organizationService.getAllOrganizations(query);

    logger.info("Organizations list fetched", {
      userId: req.user?.id,
      count: result.data.length,
    });

    return ApiResponse.ok(res, result.data, "Organizations retrieved", result.meta);
  },
);

// GET /admin/organizations/:id - Get single organization (super_admin only)
const getOrganizationById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Valid Organization ID is required");
    }

    const organization = await organizationService.getOrganizationById(
      id,
      req.user,
    );

    logger.info("Organization detail fetched", {
      userId: req.user?.id,
      targetOrgId: id,
    });

    return ApiResponse.ok(res, organization, "Organization retrieved");
  },
);

// GET /organizations/by-slug/:slug - Authenticated slug -> id resolution
const getOrganizationBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { slug } = OrganizationSlugParamSchema.parse(req.params);

    const organization = await organizationService.getOrganizationBySlug(
      slug,
      req.user,
    );

    logger.info("Organization fetched by slug", {
      slug,
      userId: req.user?.id,
      targetOrgId: organization.id,
    });

    return ApiResponse.ok(res, organization, "Organization retrieved");
  },
);

// POST /admin/organizations - Create new organization with admin user (super_admin only)
const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const data = CreateOrganizationSchema.parse(req.body);
  const assets = getUploadedOrganizationAssets(req);

  const { organization, adminUser } =
    await organizationService.createOrganization({ ...data, ...assets });

  logger.info("Organization created", {
    userId: req.user?.id,
    targetOrgId: organization.id,
    adminUserId: adminUser.id,
    prefix: organization.prefix,
  });

  await recordAudit(req, {
    action: "ORG_CREATED",
    entityType: "ORGANIZATION",
    entityId: organization.id,
    organizationId: organization.id,
    after: pickFields(organization, AUDITED_ORG_FIELDS),
  });

  // The initial subscription is opened inside the same creation transaction
  // (organization.service). Record it as its own commercially-meaningful event
  // rather than folding it into ORG_CREATED, so the billing trail is complete.
  const subscription =
    await billingRepository.findSubscriptionByOrganizationId(organization.id);
  if (subscription) {
    await recordAudit(req, {
      action: "SUBSCRIPTION_CREATED",
      entityType: "SUBSCRIPTION",
      entityId: subscription.id,
      organizationId: organization.id,
      after: { planId: subscription.planId, status: subscription.status },
    });
  }

  dashboardService.invalidateSuperAdminDashboard();

  return ApiResponse.created(
    res,
    { organization, adminUser },
    "Organization and admin user created successfully",
  );
});

// PATCH /admin/organizations/:id - Update organization (super_admin only)
const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || typeof id !== "string") {
    throw AppError.validation.badRequest("Valid Organization ID is required");
  }

  const data = UpdateOrganizationSchema.parse(req.body);
  const assets = getUploadedOrganizationAssets(req);

  // Prior state for the audit diff — see the note in userController.updateUser.
  const previousOrganization = await organizationService.getOrganizationById(
    id,
    req.user,
  );

  const organization = await organizationService.updateOrganization(
    id,
    { ...data, ...assets },
    req.user,
  );

  for (const field of ORGANIZATION_ASSET_FIELDS) {
    if (assets[field] && previousOrganization[field]) {
      await deleteStoredAsset(
        previousOrganization[field],
        `Organization ${field} replaced`,
      );
    }
  }

  logger.info("Organization updated", {
    userId: req.user?.id,
    targetOrgId: id,
  });

  await recordAudit(req, {
    action: "ORG_UPDATED",
    entityType: "ORGANIZATION",
    entityId: id,
    organizationId: id,
    before: pickFields(previousOrganization, AUDITED_ORG_FIELDS),
    after: pickFields(organization, AUDITED_ORG_FIELDS),
  });

  return ApiResponse.ok(res, organization, "Organization updated successfully");
});

// PATCH /admin/organizations/:id/status - Update organization status (super_admin only)
const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || typeof id !== "string") {
    throw AppError.validation.badRequest("Valid Organization ID is required");
  }

  if (
    typeof status !== "string" ||
    !ORGANIZATION_STATUS_VALUES.includes(
      status as (typeof ORGANIZATION_STATUS_VALUES)[number],
    )
  ) {
    throw AppError.validation.badRequest(
      `Valid status is required (${ORGANIZATION_STATUS_VALUES.join(", ")})`,
    );
  }

  const previousOrganization = await organizationService.getOrganizationById(
    id,
    req.user,
  );

  const organization = await organizationService.updateOrganizationStatus(
    id,
    status as any,
    req.user,
  );

  logger.info("Organization status updated", {
    userId: req.user?.id,
    targetOrgId: id,
    newStatus: status,
  });

  await recordAudit(req, {
    action:
      organization.status === "SUSPENDED" ? "ORG_SUSPENDED" : "ORG_ACTIVATED",
    entityType: "ORGANIZATION",
    entityId: id,
    organizationId: id,
    before: { status: previousOrganization.status },
    after: { status: organization.status },
  });

  // Moves an organization between the Active and Suspended slices.
  dashboardService.invalidateSuperAdminDashboard();

  return ApiResponse.ok(res, organization, "Organization status updated successfully");
});

// DELETE /organizations/:id - Archive (soft delete) an organization
const archiveOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || typeof id !== "string") {
    throw AppError.validation.badRequest("Valid Organization ID is required");
  }

  if (!req.user) {
    throw AppError.authentication.unauthorized("User not authenticated");
  }

  // Read the real prior status — an organization may already be suspended when
  // it is archived, and the audit row must not claim it was active.
  const previousOrganization = await organizationService.getOrganizationById(
    id,
    req.user,
  );

  const organization = await organizationService.archiveOrganization(
    id,
    req.user.id,
  );

  logger.warn("Organization archived", {
    userId: req.user.id,
    targetOrgId: id,
    slug: organization.slug,
  });

  await recordAudit(req, {
    action: "ORG_ARCHIVED",
    entityType: "ORGANIZATION",
    entityId: id,
    organizationId: id,
    before: {
      status: previousOrganization.status,
      isArchived: previousOrganization.isArchived,
    },
    after: { status: organization.status, isArchived: true },
  });

  // The platform dashboard counts live tenants, so this changed its numbers.
  dashboardService.invalidateSuperAdminDashboard();

  return ApiResponse.ok(res, organization, "Organization archived successfully");
});

// PATCH /organizations/:id/restore - Restore an archived organization
const restoreOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || typeof id !== "string") {
    throw AppError.validation.badRequest("Valid Organization ID is required");
  }

  const organization = await organizationService.restoreOrganization(id);

  logger.info("Organization restored", {
    userId: req.user?.id,
    targetOrgId: id,
    slug: organization.slug,
  });

  await recordAudit(req, {
    action: "ORG_RESTORED",
    entityType: "ORGANIZATION",
    entityId: id,
    organizationId: id,
    // Only the archived flag is asserted here — it is the one thing the
    // service guarantees was true, since restore rejects a live organization.
    before: { isArchived: true },
    after: { status: organization.status, isArchived: false },
  });

  dashboardService.invalidateSuperAdminDashboard();

  return ApiResponse.ok(res, organization, "Organization restored successfully");
});

// GET /admin/organizations/:id/users - Get users in organization (super_admin only)
const getOrganizationUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Valid Organization ID is required");
    }

    const users = await organizationService.getOrganizationUsers(id, req.user);

    logger.info("Organization users fetched", {
      userId: req.user?.id,
      targetOrgId: id,
      count: users.length,
    });

    return ApiResponse.ok(res, users, "Users retrieved");
  },
);

export const organizationController = {
  getAllOrganizations,
  getOrganizationById,
  getOrganizationBySlug,
  createOrganization,
  updateOrganization,
  updateStatus,
  archiveOrganization,
  restoreOrganization,
  getOrganizationUsers,
};
