import { Prisma } from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { AppError } from "../../utils/errors/appError";
import { leadInclude } from "../../utils/selectors";
import { paginate } from "../../utils/db/paginate";

const baseWhere = (id: string, organizationId: string) => ({
  id,
  organizationId,
  deletedAt: null,
});

const buildLeadNo = (organizationPrefix: string, sequence: number) =>
  `${organizationPrefix}-LD-${String(sequence).padStart(4, "0")}`;

const getOrganizationLeadPrefix = async (db: DB, organizationId: string) => {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { prefix: true },
  });

  if (!organization) {
    throw AppError.resource.notFound("Organization");
  }

  return organization.prefix;
};

/**
 * Maps a single relationship field for Prisma.
 * Handles Connect (string), Disconnect (null), or Skip (undefined).
 */
const mapRelation = (id: string | null | undefined) => {
  if (id === undefined) return undefined;
  if (id === null || id === "") return { disconnect: true };
  return { connect: { id } };
};

/**
 * Transforms flat domain-like data into Prisma-compatible input.
 * Centralizes relation mapping (connect/disconnect).
 */
const mapLeadDataToPrisma = (data: any, isUpdate = false) => {
  const {
    organizationId,
    createdById,
    assignedToId,
    assignedById,
    productInterestId,
    ...rest
  } = data;

  const prismaData: any = { ...rest };

  if (!isUpdate) {
    if (organizationId)
      prismaData.organization = { connect: { id: organizationId } };
    if (createdById) prismaData.createdBy = { connect: { id: createdById } };
    if (assignedToId) prismaData.assignedTo = { connect: { id: assignedToId } };
    if (assignedById) prismaData.assignedBy = { connect: { id: assignedById } };
    if (productInterestId)
      prismaData.productInterest = { connect: { id: productInterestId } };
  } else {
    if (assignedToId !== undefined)
      prismaData.assignedTo = mapRelation(assignedToId);
    if (assignedById !== undefined)
      prismaData.assignedBy = mapRelation(assignedById);
    if (productInterestId !== undefined)
      prismaData.productInterest = mapRelation(productInterestId);
  }

  return prismaData;
};

async function createLeadWithGeneratedNumber(
  organizationId: string,
  data: any, // Accepts flat internal data
  tx?: DB,
) {
  const execute = async (db: DB) => {
    // 🔥 Atomic increment
    const organizationPrefix = await getOrganizationLeadPrefix(
      db,
      organizationId,
    );
    const seq = await db.leadSequence.upsert({
      where: { organizationId },
      update: {
        lastSequence: { increment: 1 },
      },
      create: {
        organizationId,
        lastSequence: 1,
      },
    });

    const leadNo = buildLeadNo(organizationPrefix, seq.lastSequence);

    // 3. Create lead
    const prismaData = mapLeadDataToPrisma(
      { ...data, leadNo, organizationId },
      false,
    );

    console.log("prismaData : ", prismaData);

    return db.lead.create({
      data: prismaData,
      include: leadInclude,
    });
  };

  return tx ? execute(tx) : prisma.$transaction(execute);
}

async function findLeadById(id: string, organizationId: string, tx?: DB) {
  const db = tx || prisma;
  return db.lead.findFirst({
    where: baseWhere(id, organizationId),
    include: {
      assignedTo: {
        select: { managerId: true },
      },
    },
  });
}

async function getLeadById(id: string, organizationId: string, tx?: DB) {
  const db = tx || prisma;
  return db.lead.findFirst({
    where: baseWhere(id, organizationId),
    include: leadInclude,
  });
}

async function updateLead(
  id: string,
  data: any, // Accepts flat internal data
  organizationId: string,
  tx?: DB,
) {
  const db = tx || prisma;

  // Single-source-of-truth lock: Only update if lead exists, is not deleted, and has NO prospect record
  const lead = await db.lead.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
    include: {
      prospect: { select: { id: true, deletedAt: true } },
    },
  });

  if (!lead) {
    return null;
  }

  if (lead.prospect && !lead.prospect.deletedAt) {
    throw AppError.business.stateConflict(
      "Cannot update lead after it has been converted to a prospect",
    );
  }

  const prismaData = mapLeadDataToPrisma(data, true);

  return db.lead.update({
    where: { id },
    data: prismaData,
    include: leadInclude,
  });
}

async function softDeleteLead(
  id: string,
  organizationId: string,
  userId: string,
  tx?: DB,
) {
  const db = tx || prisma;
  const lead = await db.lead.findFirst({
    where: baseWhere(id, organizationId),
    select: { id: true },
  });

  if (!lead) return null;

  return db.lead.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: userId,
    },
    include: leadInclude,
  });
}

async function assignLead(
  id: string,
  executiveId: string,
  assignedById: string,
  organizationId: string,
  tx?: DB,
) {
  const db = tx || prisma;
  const lead = await db.lead.findFirst({
    where: baseWhere(id, organizationId),
    select: { id: true },
  });

  if (!lead) return null;

  return db.lead.update({
    where: { id },
    data: {
      assignedToId: executiveId,
      assignedById,
      assignedAt: new Date(),
    },
    include: leadInclude,
  });
}

async function getLeads(
  where: Prisma.LeadWhereInput,
  options: { page: number; limit: number },
  tx?: DB,
) {
  const db = tx || prisma;
  return paginate(db.lead, where, options, db, {
    include: leadInclude,
    orderBy: { createdAt: "desc" },
  });
}

async function reserveLeadNumbers(
  organizationId: string,
  count: number,
  tx?: DB,
) {
  const db = tx || prisma;
  const organizationPrefix = await getOrganizationLeadPrefix(
    db,
    organizationId,
  );
  const seq = await db.leadSequence.upsert({
    where: { organizationId },
    update: {
      lastSequence: { increment: count },
    },
    create: {
      organizationId,
      lastSequence: count,
    },
  });

  return {
    organizationPrefix,
    startingSequence: seq.lastSequence - count + 1,
    lastSequence: seq.lastSequence,
  };
}

async function createLeadWithNumber(
  organizationId: string,
  leadNo: string,
  data: any,
  tx?: DB,
) {
  const db = tx || prisma;
  const prismaData = mapLeadDataToPrisma(
    { ...data, leadNo, organizationId },
    false,
  );

  return db.lead.create({
    data: prismaData,
    include: leadInclude,
  });
}

async function createManyLeads(data: Prisma.LeadCreateManyInput[], tx?: DB) {
  const db = tx || prisma;
  return db.lead.createMany({
    data,
    skipDuplicates: true,
  });
}

async function findLeadsByEmailsOrMobiles(
  organizationId: string,
  emails: string[],
  mobiles: string[],
  tx?: DB,
) {
  const db = tx || prisma;
  const conditions = [];
  if (emails.length > 0) {
    conditions.push({ email: { in: emails } });
  }
  if (mobiles.length > 0) {
    conditions.push({ mobile: { in: mobiles } });
  }
  if (conditions.length === 0) {
    return [];
  }
  return db.lead.findMany({
    where: {
      organizationId,
      deletedAt: null,
      OR: conditions,
    },
    select: {
      email: true,
      mobile: true,
    },
  });
}

export const leadRepository = {
  buildLeadNo,
  createLeadWithGeneratedNumber,
  reserveLeadNumbers,
  createLeadWithNumber,
  createManyLeads,
  findLeadsByEmailsOrMobiles,
  findLeadById,
  getLeadById,
  updateLead,
  softDeleteLead,
  assignLead,
  getLeads,
};
