import { Prisma, OrganizationStatus as PrismaOrganizationStatus, Role } from "@prisma/client";
import { organizationRepository } from "./organization.repository";
import { userRepository } from "../user/user.repository";
import { userService } from "../user/user.service";
import { billingRepository } from "../billing/billing.repository";
import { prisma, DB } from "../../config/db";
import { hashPassword } from "../../utils/auth/password";
import { buildInitialSubscription } from "../../utils/business/subscription.utils";
import { AppError } from "../../utils/errors/appError";
import type {
  CreateOrganizationInput,
  OrganizationFilterInput,
  UpdateOrganizationInput,
} from "../../contracts/validation";
import type {
  CreateOrganizationResult,
  Organization,
  PublicOrganization,
} from "../../contracts/types";
import { ensureSameOrg } from "../../utils/security/orgSafety";
import { deleteStoredAsset } from "../../utils/uploads/assetFiles";
import { platformSettingsRepository } from "../platformSettings/platformSettings.repository";

type OrgScopedUser =
  | {
      role: Role;
      organizationId?: string | null;
    }
  | undefined;

/**
 * Virtual status used by the organization list filter. Not a column value —
 * getAllOrganizations translates it into a deletedAt check.
 */
const ARCHIVED_STATUS_FILTER = "ARCHIVED";

export type OrganizationAssetInput = {
  companyLogo?: string | null;
  qrCode?: string | null;
  signature?: string | null;
};

export const organizationService = {
  mapOrganizationToResponse: (organization: any): Organization => {
    const { _count, dateOfRegistration, createdAt, updatedAt, deletedAt, ...rest } =
      organization;

    return {
      ...rest,
      orgType: (rest.orgType === "type1" || rest.orgType === "type2") ? rest.orgType : null,
      dateOfRegistration: dateOfRegistration?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      deletedAt: deletedAt?.toISOString() ?? null,
      isArchived: Boolean(deletedAt),
      _count,
    };
  },

  getAllOrganizations: async (
    params: OrganizationFilterInput,
  ): Promise<{ data: Organization[]; meta: any }> => {
    // "ARCHIVED" is a virtual status: it is not a column value but a deletedAt
    // check. Split it out here so the repository keeps dealing in real statuses.
    const requestedStatuses = params.status
      ? (Array.isArray(params.status) ? params.status : [params.status])
      : [];
    const wantsArchived = requestedStatuses.includes(ARCHIVED_STATUS_FILTER);
    const liveStatuses = requestedStatuses.filter(
      (status) => status !== ARCHIVED_STATUS_FILTER,
    ) as PrismaOrganizationStatus[];

    const result = await organizationRepository.findAll({
      pageNum: params.page,
      limitNum: params.limit,
      search: params.search,
      status: liveStatuses.length > 0 ? liveStatuses : undefined,
      // Only archived selected → show archived only.
      // Archived plus live statuses → show both.
      archivedOnly: wantsArchived && liveStatuses.length === 0,
      includeArchived: wantsArchived && liveStatuses.length > 0,
    });
    return {
      data: result.data.map(organizationService.mapOrganizationToResponse),
      meta: result.meta
    };
  },

  getOrganizationById: async (id: string, user?: OrgScopedUser): Promise<Organization> => {
    ensureSameOrg(user, id);

    const organization = await organizationRepository.findById(id);
    if (!organization) {
      throw AppError.resource.notFound("Organization");
    }
    return organizationService.mapOrganizationToResponse(organization);
  },

  /**
   * Slug → id resolution for the super-admin workspace routes.
   *
   * A tenant user may only resolve its own organization, and a miss is a 404
   * rather than a 403 on purpose: a 403 would confirm that the slug exists and
   * hand back exactly the enumeration this lookup used to allow anonymously.
   */
  getOrganizationBySlug: async (
    slug: string,
    user?: OrgScopedUser,
  ): Promise<PublicOrganization> => {
    if (!user) {
      throw AppError.authentication.tokenInvalid("Authentication required");
    }

    const organization = await organizationRepository.findBySlug(slug);
    if (!organization) {
      throw AppError.resource.notFound("Organization");
    }

    if (
      user.role !== Role.SUPER_ADMIN &&
      organization.id !== (user.organizationId ?? undefined)
    ) {
      throw AppError.resource.notFound("Organization");
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.companyLogo,
      prefix: organization.prefix,
      status: organization.status,
    };
  },

  createOrganization: async (
    data: CreateOrganizationInput & OrganizationAssetInput,
  ): Promise<CreateOrganizationResult> => {
    const {
      name,
      slug,
      prefix,
      status,
      authorizedPerson,
      orgType,
      mobile,
      gstin,
      address,
      dateOfRegistration,
      email,
      remark,
      companyLogo,
      qrCode,
      signature,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
      adminMobile,
      planId,
    } = data;

    // Uniqueness checks deliberately include archived organizations: their slug
    // and prefix stay reserved. Releasing a prefix would let a new organization
    // reuse it and collide with the archived org's document numbering.
    const existingOrg = await organizationRepository.findBySlug(slug, undefined, {
      includeArchived: true,
    });
    if (existingOrg) {
      throw AppError.resource.conflict(
        "Organization with this slug already exists",
      );
    }

    const upperPrefix = prefix.toUpperCase();
    const existingPrefix = await organizationRepository.findByPrefix(
      upperPrefix,
      undefined,
      { includeArchived: true },
    );
    if (existingPrefix) {
      throw AppError.resource.conflict(
        "Organization with this prefix already exists",
      );
    }

    const existingUser = await userRepository.findByEmail(adminEmail);
    if (existingUser) {
      throw AppError.resource.conflict("User with this email already exists");
    }

    /*
     * Fall back to the platform default when no plan was named. This is the
     * only thing that gives PlatformSetting.defaultPlanId meaning, and it lets
     * an API or scripted onboarding create an organization without knowing the
     * catalogue.
     */
    let resolvedPlanId = planId;
    if (!resolvedPlanId) {
      const settings = await platformSettingsRepository.get();
      if (!settings.defaultPlanId) {
        throw AppError.validation.badRequest(
          "No plan was selected and no default plan is configured. " +
            "Choose a plan, or set a default in Platform Settings.",
        );
      }
      resolvedPlanId = settings.defaultPlanId;
    }

    // Validate the chosen plan before opening the transaction — a bad planId
    // should fail fast, not roll back a half-built organization. A retired plan
    // (isActive: false) cannot take new subscribers.
    const plan = await billingRepository.findPlanById(resolvedPlanId);
    if (!plan) {
      throw AppError.resource.notFound("Plan");
    }
    if (!plan.isActive) {
      throw AppError.validation.badRequest(
        "The selected plan is retired and cannot be assigned to a new organization",
      );
    }

    // 🔥 FIX: normalize status
    const normalizedStatus: PrismaOrganizationStatus = status
      ? (status.toUpperCase() as PrismaOrganizationStatus)
      : PrismaOrganizationStatus.ACTIVE;

    // Hash BEFORE opening the transaction. bcrypt is ~100ms of pure CPU and
    // needs no database — holding an interactive transaction open across it just
    // burns the transaction's time budget (this flow now also creates a
    // subscription, which pushed it past the default 5s timeout).
    const hashedPassword = await hashPassword(adminPassword);

    return prisma.$transaction(
      async (tx: DB) => {
      const organization = await organizationRepository.create(
        {
          name,
          slug,
          prefix: upperPrefix,
          status: normalizedStatus,
          orgType,
          mobile,
          gstin,
          address,
          dateOfRegistration: new Date(dateOfRegistration),
          email,
          remark,
          authorizedPerson,
          companyLogo,
          qrCode,
          signature,
        },
        tx,
      );

      await (tx as any).leadSequence.upsert({
        where: { organizationId: organization.id },
        update: {},
        create: {
          organizationId: organization.id,
          lastSequence: 0,
        },
      });

      await (tx as any).userSequence.upsert({
        where: { organizationId: organization.id },
        update: {},
        create: {
          organizationId: organization.id,
          lastSequence: 0,
        },
      });

      await (tx as any).prospectSequence.upsert({
        where: { organizationId: organization.id },
        update: {},
        create: {
          organizationId: organization.id,
          lastSequence: 0,
        },
      });

      await (tx as any).quotationSequence.upsert({
        where: {
          organizationId_year: {
            organizationId: organization.id,
            year: new Date().getUTCFullYear(),
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          year: new Date().getUTCFullYear(),
          lastSequence: 0,
        },
      });

      const employeeId = await userService.generateEmployeeId(organization.id, tx);

      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          firstName: adminFirstName,
          lastName: adminLastName,
          mobile: adminMobile,
          role: Role.ADMIN,
          organizationId: organization.id,
          employeeId,
          passwordChangedAt: new Date(),
        },
      });

      // Open the subscription in the SAME transaction. This is the fix for the
      // whole billing-integrity cluster: every enforcement path assumes each
      // live org has a subscription, and now one exists the moment the org does,
      // so the documented fail-open branches become unreachable by construction.
      const initial = buildInitialSubscription(plan);
      await billingRepository.createSubscription(
        {
          organizationId: organization.id,
          planId: plan.id,
          status: initial.status,
          trialEndsAt: initial.trialEndsAt,
          currentPeriodStart: initial.currentPeriodStart,
          currentPeriodEnd: initial.currentPeriodEnd,
        },
        tx,
      );

      return {
        organization: organizationService.mapOrganizationToResponse(organization),
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: "ADMIN" as const,
          organizationId: adminUser.organizationId ?? organization.id,
          employeeId: adminUser.employeeId ?? null,
        },
      };
      },
      // Org creation legitimately does a lot in one atomic unit — organization,
      // four sequences, the admin user, and the subscription. Give it headroom
      // over the 5s default so remote DB latency does not abort a valid create.
      { timeout: 20000 },
    );
  },

  updateOrganization: async (
    id: string,
    data: UpdateOrganizationInput & OrganizationAssetInput,
    user?: OrgScopedUser,
  ): Promise<Organization> => {
    ensureSameOrg(user, id);

    const existingOrg = await organizationRepository.findById(id);
    if (!existingOrg) {
      throw AppError.resource.notFound("Organization");
    }

    // As in createOrganization, archived slugs and prefixes remain reserved.
    if (data.slug && data.slug !== existingOrg.slug) {
      const slugExists = await organizationRepository.findBySlug(
        data.slug,
        undefined,
        { includeArchived: true },
      );
      if (slugExists) {
        throw AppError.resource.conflict(
          "Organization with this slug already exists",
        );
      }
    }

    if (data.prefix) {
      const upperPrefix = data.prefix.toUpperCase();
      if (upperPrefix !== existingOrg.prefix) {
        const prefixExists = await organizationRepository.findByPrefix(
          upperPrefix,
          undefined,
          { includeArchived: true },
        );
        if (prefixExists && prefixExists.id !== id) {
          throw AppError.resource.conflict(
            "Organization with this prefix already exists",
          );
        }
      }
    }

    /**
     * Assets this update supersedes, resolved from the row we already loaded.
     * Deleted only after the transaction commits — unlinking first would
     * destroy the live asset if the write then rolled back.
     */
    const replacedAssetPaths = (
      ["companyLogo", "qrCode", "signature"] as const
    ).reduce<string[]>((paths, field) => {
      const nextValue = data[field];
      const previous = existingOrg[field];

      if (nextValue !== undefined && previous && previous !== nextValue) {
        paths.push(previous);
      }
      return paths;
    }, []);

    const result = await prisma.$transaction(async (tx: DB) => {
      const updatedOrg = await organizationRepository.update(
        id,
        {
          ...data,
          prefix: data.prefix?.toUpperCase(),
          status: data.status
            ? (data.status.toUpperCase() as PrismaOrganizationStatus)
            : undefined,
          dateOfRegistration: data.dateOfRegistration
            ? new Date(data.dateOfRegistration)
            : undefined,
        },
        tx,
      );

      if (!updatedOrg) {
        throw AppError.resource.notFound("Organization");
      }

      return organizationService.mapOrganizationToResponse(updatedOrg);
    });

    await Promise.all(
      replacedAssetPaths.map((assetPath) =>
        deleteStoredAsset(assetPath, "replaced by organization update"),
      ),
    );

    return result;
  },

  updateOrganizationStatus: async (
    id: string,
    status: PrismaOrganizationStatus,
    user?: OrgScopedUser,
  ): Promise<Organization> => {
    ensureSameOrg(user, id);

    const organization = await organizationRepository.findById(id);
    if (!organization) {
      throw AppError.resource.notFound("Organization");
    }

    const updated = await organizationRepository.update(id, { status });
    if (!updated) {
      throw AppError.resource.notFound("Organization");
    }
    return organizationService.mapOrganizationToResponse(updated);
  },

  /**
   * Archive (soft delete) an organization.
   *
   * Nothing is physically deleted. The row is marked deletedAt and forced to
   * SUSPENDED, which is what actually locks its users out — login, refresh and
   * requireAuth all already reject a non-ACTIVE organization.
   */
  archiveOrganization: async (
    id: string,
    deletedById: string,
  ): Promise<Organization> => {
    const organization = await organizationRepository.findById(id, undefined, {
      includeArchived: true,
    });
    if (!organization) {
      throw AppError.resource.notFound("Organization");
    }

    if (organization.deletedAt) {
      throw AppError.business.stateConflict(
        "Organization is already archived",
      );
    }

    const archived = await organizationRepository.archive(id, deletedById);
    return organizationService.mapOrganizationToResponse(archived);
  },

  /** Restore an archived organization and reactivate it. */
  restoreOrganization: async (id: string): Promise<Organization> => {
    const organization = await organizationRepository.findById(id, undefined, {
      includeArchived: true,
    });
    if (!organization) {
      throw AppError.resource.notFound("Organization");
    }

    if (!organization.deletedAt) {
      throw AppError.business.stateConflict("Organization is not archived");
    }

    const restored = await organizationRepository.restore(id);
    return organizationService.mapOrganizationToResponse(restored);
  },

  getOrganizationUsers: async (id: string, user?: OrgScopedUser) => {
    ensureSameOrg(user, id);

    const organization = await organizationRepository.findById(id);
    if (!organization) {
      throw AppError.resource.notFound("Organization");
    }

    return organizationRepository.getOrganizationUsers(id);
  },
};
