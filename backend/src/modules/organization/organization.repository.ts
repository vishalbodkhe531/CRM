import { prisma, DB } from "../../config/db";
import { OrganizationStatus, Prisma, Role } from "@prisma/client";
import { safeUserSelect } from "../../utils/selectors/user.select";
import { paginate } from "../../utils/db/paginate";

const organizationInclude = {
  _count: {
    select: {
      users: true,
      leads: true,
      items: true,
    },
  },
};

/**
 * Archived (soft-deleted) organizations are excluded from every finder by
 * default. Pass `includeArchived` only where an archived row is genuinely
 * wanted — restoring one, or checking slug/prefix uniqueness, where archived
 * values stay reserved so a new organization cannot reuse an old prefix and
 * corrupt document numbering.
 */
export interface ArchiveScopeOptions {
  includeArchived?: boolean;
}

const archiveFilter = (options?: ArchiveScopeOptions) =>
  options?.includeArchived ? {} : { deletedAt: null };

export const organizationRepository = {
  // Get all organizations (for super admin) - with pagination
  findAll: async (
    options: {
      pageNum?: number;
      limitNum?: number;
      search?: string;
      status?: OrganizationStatus | OrganizationStatus[];
      /** Return only archived rows instead of only live ones. */
      archivedOnly?: boolean;
      /** Return live rows matching `status` plus every archived row. */
      includeArchived?: boolean;
    } = {},
    tx?: DB,
  ) => {
    const db = tx || prisma;
    const page = options.pageNum || 1;
    const limit = Math.min(options.limitNum || 10, 100);

    // Built as an AND list so the search OR and the archive OR cannot overwrite
    // each other — assigning `where.OR` twice silently drops the first one.
    const conditions: Prisma.OrganizationWhereInput[] = [];

    if (options.search) {
      conditions.push({
        OR: [
          { name: { contains: options.search, mode: "insensitive" } },
          { slug: { contains: options.search, mode: "insensitive" } },
          { prefix: { contains: options.search, mode: "insensitive" } },
        ],
      });
    }

    const statusFilter: Prisma.OrganizationWhereInput | null = options.status
      ? {
          status: Array.isArray(options.status)
            ? { in: options.status }
            : options.status,
        }
      : null;

    if (options.archivedOnly) {
      conditions.push({ deletedAt: { not: null } });
      if (statusFilter) conditions.push(statusFilter);
    } else if (options.includeArchived) {
      conditions.push({
        OR: [
          { deletedAt: { not: null } },
          { deletedAt: null, ...(statusFilter ?? {}) },
        ],
      });
    } else {
      conditions.push({ deletedAt: null });
      if (statusFilter) conditions.push(statusFilter);
    }

    const where: Prisma.OrganizationWhereInput =
      conditions.length > 0 ? { AND: conditions } : {};

    return paginate(
      db.organization,
      where,
      { page, limit },
      db,
      {
        orderBy: { createdAt: "desc" },
        include: organizationInclude,
      }
    );
  },

  // Get single organization by ID
  findById: async (id: string, tx?: DB, options?: ArchiveScopeOptions) => {
    const db = tx || prisma;
    // findFirst, not findUnique: findUnique cannot take a non-unique filter.
    return await db.organization.findFirst({
      where: { id, ...archiveFilter(options) },
      include: organizationInclude,
    });
  },

  // Get organization by slug
  findBySlug: async (slug: string, tx?: DB, options?: ArchiveScopeOptions) => {
    const db = tx || prisma;
    return await db.organization.findFirst({
      where: { slug, ...archiveFilter(options) },
      include: organizationInclude,
    });
  },

  // Get organization by prefix
  findByPrefix: async (
    prefix: string,
    tx?: DB,
    options?: ArchiveScopeOptions,
  ) => {
    const db = tx || prisma;
    return await db.organization.findFirst({
      where: { prefix, ...archiveFilter(options) },
      include: organizationInclude,
    });
  },

  // Create new organization
  create: async (
    data: {
      name: string;
      slug: string;
      prefix: string;
      status?: OrganizationStatus;
      authorizedPerson?: string;
      orgType?: string;
      mobile?: string;
      gstin?: string;
      address?: string;
      dateOfRegistration?: Date;
      email?: string;
      remark?: string | null;
      companyLogo?: string | null;
      qrCode?: string | null;
      signature?: string | null;
    },
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return await db.organization.create({
      data,
      include: organizationInclude,
    });
  },

  // Update organization
  update: async (
    id: string,
    data: {
      name?: string;
      slug?: string;
      prefix?: string;
      status?: OrganizationStatus;
      authorizedPerson?: string;
      orgType?: string;
      mobile?: string;
      gstin?: string;
      address?: string;
      dateOfRegistration?: Date;
      email?: string;
      remark?: string | null;
      companyLogo?: string | null;
      qrCode?: string | null;
      signature?: string | null;
    },
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return await db.organization.update({
      where: { id },
      data,
      include: organizationInclude,
    });
  },


  // Archive (soft delete) an organization.
  // Also forces SUSPENDED so the existing auth checks lock users out — see
  // auth.middleware.ts and auth.service.login.
  archive: async (id: string, deletedById: string, tx?: DB) => {
    const db = tx || prisma;
    return await db.organization.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById,
        status: OrganizationStatus.SUSPENDED,
      },
      include: organizationInclude,
    });
  },

  // Restore an archived organization back to ACTIVE.
  restore: async (id: string, tx?: DB) => {
    const db = tx || prisma;
    return await db.organization.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
        status: OrganizationStatus.ACTIVE,
      },
      include: organizationInclude,
    });
  },

  // Get users in an organization (exclude sensitive data)
  getOrganizationUsers: async (organizationId: string, tx?: DB) => {
    const db = tx || prisma;
    return await db.user.findMany({
      where: { organizationId },
      select: safeUserSelect,
    });
  },

};
