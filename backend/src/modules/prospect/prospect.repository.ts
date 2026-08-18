import { LeadStatus, Prisma, ProspectStage } from "@prisma/client";
import { DB, prisma } from "../../config/db";
import { paginate } from "../../utils/db/paginate";
import { logger } from "../../config/logger";

const prospectLeadSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  companyName: true,
  gstin: true,
  leadNo: true,
  mobile: true,
  alternateMobile: true,
  website: true,
  linkedInProfile: true,
  address: true,
  city: true,
  state: true,
  pinCode: true,
  source: true,
  industry: true,
  leadType: true,
  status: true,
  productInterestId: true,
  productInterest: {
    select: { id: true, name: true, itemCode: true },
  },
  requiredDescription: true,
  deletedAt: true,
} as const;

const prospectUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  managerId: true,
} as const;

const prospectListInclude = {
  lead: { select: prospectLeadSelect },
  assignedTo: { select: prospectUserSelect },
  followUpAssignedTo: { select: prospectUserSelect },
} as const;

const prospectDetailInclude = {
  ...prospectListInclude,
  activities: {
    include: {
      createdBy: { select: prospectUserSelect },
    },
    orderBy: { createdAt: "desc" },
  },
} as const;

const getProspectNumberPrefix = () => {
  return "PR";
};

const getUniqueErrorTarget = (error: unknown) => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return target.map(String);
    }
    if (typeof target === "string") {
      return [target];
    }
  }

  return [];
};

const getMaxProspectSequence = async (organizationId: string, db: DB) => {
  const [row] = await db.$queryRaw<Array<{ maxSequence: number | bigint | null }>>`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING("prospectNo" FROM '^PR-([0-9]+)$') AS INTEGER)),
      0
    ) AS "maxSequence"
    FROM "Prospect"
    WHERE "organizationId" = ${organizationId}
  `;

  return Number(row?.maxSequence ?? 0);
};

const reserveNextProspectSequence = async (
  organizationId: string,
  db: DB,
) => {
  const maxExistingSequence = await getMaxProspectSequence(organizationId, db);
  const [row] = await db.$queryRaw<Array<{ lastSequence: number | bigint }>>`
    INSERT INTO "ProspectSequence" ("organizationId", "lastSequence", "updatedAt")
    VALUES (${organizationId}, ${maxExistingSequence + 1}, NOW())
    ON CONFLICT ("organizationId")
    DO UPDATE SET
      "lastSequence" = GREATEST("ProspectSequence"."lastSequence", ${maxExistingSequence}) + 1,
      "updatedAt" = NOW()
    RETURNING "lastSequence"
  `;

  const lastSequence = Number(row.lastSequence);

  if (maxExistingSequence > 0 && lastSequence === maxExistingSequence + 1) {
    logger.info("Prospect sequence reserved after max check", {
      organizationId,
      maxExistingSequence,
      lastSequence,
    });
  }

  return lastSequence;
};

export const prospectRepository = {
  createWithGeneratedNumber: async (
    organizationId: string,
    data: Omit<Prisma.ProspectCreateInput, "prospectNo">,
    tx?: DB,
  ) => {
    const db = tx || prisma;
    const sequence = await reserveNextProspectSequence(organizationId, db);
    const prospectNo = `${getProspectNumberPrefix()}-${String(sequence).padStart(4, "0")}`;

    try {
      return await db.prospect.create({
        data: {
          ...data,
          prospectNo,
        },
        include: prospectDetailInclude,
      });
    } catch (error) {
      logger.warn("Prospect creation failed on unique constraint", {
        organizationId,
        prospectNo,
        target: getUniqueErrorTarget(error),
      });
      throw error;
    }
  },

  createActivity: async (
    data: Prisma.ProspectActivityUncheckedCreateInput,
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return db.prospectActivity.create({
      data,
      include: {
        createdBy: { select: prospectUserSelect },
      },
    });
  },

  findById: async (id: string, organizationId: string, tx?: DB) => {
    const db = tx || prisma;
    return db.prospect.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: prospectDetailInclude,
    });
  },

  findByLeadId: async (leadId: string, organizationId: string, tx?: DB) => {
    const db = tx || prisma;
    return db.prospect.findFirst({
      where: {
        leadId,
        organizationId,
        deletedAt: null,
      },
      include: prospectDetailInclude,
    });
  },

  findDeletedByLeadId: async (
    leadId: string,
    organizationId: string,
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return db.prospect.findFirst({
      where: {
        leadId,
        organizationId,
        deletedAt: { not: null },
      },
      select: { id: true },
    });
  },

  unlinkDeletedProspect: async (
    leadId: string,
    organizationId: string,
    tx: DB,
  ) => {
    const deleted = await prospectRepository.findDeletedByLeadId(
      leadId,
      organizationId,
      tx,
    );

    if (!deleted) {
      return;
    }

    await tx.prospect.update({
      where: { id: deleted.id },
      data: { leadId: null },
    });
  },

  findAll: async (
    params: {
      organizationId: string;
      stage?: ProspectStage | ProspectStage[] | null;
      assignedToId?: string | string[] | null;
      search?: string | null;
      createdFrom?: Date | null;
      createdTo?: Date | null;
      page: number;
      limit: number;
      status?: string | string[] | null;
      managerId?: string | null;
    },
    tx?: DB,
  ) => {
    const db = tx || prisma;
    const {
      organizationId,
      stage,
      assignedToId,
      search,
      createdFrom,
      createdTo,
      page,
      limit,
      status,
      managerId,
    } = params;

    const where: Prisma.ProspectWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (stage) {
      where.stage = Array.isArray(stage) ? { in: stage } : stage;
    }

    if (assignedToId) {
      where.assignedToId = Array.isArray(assignedToId)
        ? { in: assignedToId }
        : assignedToId;
    }

    if (managerId) {
      where.assignedTo = {
        is: {
          OR: [{ id: managerId }, { managerId }],
        },
      };
    }

    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      };
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      const leadFilter: Prisma.LeadWhereInput = {};

      if (statuses.includes("ACTIVE") && !statuses.includes("INACTIVE")) {
        leadFilter.deletedAt = null;
      } else if (statuses.includes("INACTIVE") && !statuses.includes("ACTIVE")) {
        leadFilter.deletedAt = { not: null };
      }

      const leadStatuses = statuses.filter((value): value is LeadStatus =>
        Object.values(LeadStatus).includes(value as LeadStatus),
      );
      if (leadStatuses.length > 0) {
        leadFilter.status =
          leadStatuses.length === 1 ? leadStatuses[0] : { in: leadStatuses };
      }

      if (Object.keys(leadFilter).length > 0) {
        where.lead = leadFilter;
      }
    }

    if (search) {
      where.OR = [
        { prospectNo: { contains: search, mode: "insensitive" } },
        {
          lead: {
            OR: [
              { leadNo: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { companyName: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    return paginate(db.prospect, where, { page, limit }, db, {
      include: prospectListInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  update: async (
    id: string,
    _organizationId: string,
    data: Prisma.ProspectUpdateInput,
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return db.prospect.update({
      where: { id },
      data,
      include: prospectDetailInclude,
    });
  },

  /**
   * Soft-delete a prospect. Sets deletedAt and deletedById.
   *
   * Terminal (WON/LOST) prospects must never reach this call — the service
   * enforces that guard before delegating here.
   */
  softDelete: async (
    id: string,
    organizationId: string,
    deletedById: string,
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return db.prospect.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById,
      },
    });
  },

  updateActivity: async (
    activityId: string,
    data: { metadata: Prisma.InputJsonValue },
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return db.prospectActivity.update({
      where: { id: activityId },
      data: { metadata: data.metadata },
      include: {
        createdBy: { select: prospectUserSelect },
      },
    });
  },

  countOverdue: async (
    organizationId: string,
    assignedToId?: string | string[],
    managerId?: string | null,
  ): Promise<number> => {
    const now = new Date();
    const overdueLimit = new Date(now.getTime() - 5 * 60 * 1000);
    const limitDateStart = new Date(
      Date.UTC(overdueLimit.getUTCFullYear(), overdueLimit.getUTCMonth(), overdueLimit.getUTCDate()),
    );
    const limitTime = `${String(overdueLimit.getHours()).padStart(2, "0")}:${String(overdueLimit.getMinutes()).padStart(2, "0")}`;

    const assignedToFilter = Array.isArray(assignedToId)
      ? { in: assignedToId }
      : (assignedToId ?? undefined);

    return prisma.prospect.count({
      where: {
        organizationId,
        stage: { notIn: ["WON", "LOST"] },
        deletedAt: null,
        followUpDate: { not: null },
        followUpTime: { not: null },
        ...(assignedToFilter ? { assignedToId: assignedToFilter } : {}),
        ...(managerId
          ? {
              assignedTo: {
                is: {
                  OR: [{ id: managerId }, { managerId }],
                },
              },
            }
          : {}),
        OR: [
          // Past dates (any time)
          { followUpDate: { lt: limitDateStart } },
          // Today, but time already passed
          {
            followUpDate: { gte: limitDateStart, lte: overdueLimit },
            followUpTime: { lt: limitTime },
          },
        ],
      },
    });
  },

  countDueToday: async (
    organizationId: string,
    assignedToId?: string | string[],
    managerId?: string | null,
  ): Promise<number> => {
    const today = new Date();
    const startOfToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

    const assignedToFilter = Array.isArray(assignedToId)
      ? { in: assignedToId }
      : (assignedToId ?? undefined);

    return prisma.prospect.count({
      where: {
        organizationId,
        stage: { notIn: ["WON", "LOST"] },
        deletedAt: null,
        followUpDate: { gte: startOfToday, lt: endOfToday },
        ...(assignedToFilter ? { assignedToId: assignedToFilter } : {}),
        ...(managerId
          ? {
              assignedTo: {
                is: {
                  OR: [{ id: managerId }, { managerId }],
                },
              },
            }
          : {}),
      },
    });
  },
};
