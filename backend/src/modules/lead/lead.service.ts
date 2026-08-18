import { ROLES } from "../../constants/roles";
import { AppError } from "../../utils/errors/appError";
import type { SafeUser } from "../../types/user.types";
import { leadRepository } from "./lead.repository";
import { itemRepository } from "../item/item.repository";
import { prospectService } from "../prospect/prospect.service";
import { prospectRepository } from "../prospect/prospect.repository";
import { ensureOwnership } from "../../utils/security/ownership.utils";
import {
  ensureEditableLead,
  ensureStatusChangeAllowed,
} from "../../utils/business/lead.utils";
import { logger } from "../../config/logger";
import type {
  CreateLeadInput,
  ConvertLeadToProspectInput,
  LeadFilterInput,
  UpdateLeadStatusInput,
  UpdateLeadInput,
} from "../../contracts/validation";
import type { Lead } from "../../contracts/types";
import { validateLeadAssignee } from "./lead.validation";
import { importLeads } from "./lead.import";
import { userRepository } from "../user/user.repository";
import { billingRepository } from "../billing/billing.repository";
import { assertWithinLimit } from "../billing/limit.guard";
import { toLeadDTO } from "./lead.helpers";
import { prisma, type DB } from "../../config/db";
import { leadInclude } from "../../utils/selectors";
import {
  Industry as PrismaIndustry,
  LeadSource as PrismaLeadSource,
  LeadStatus as PrismaLeadStatus,
  Prisma,
  ProspectActivityType,
  ProspectStage,
  UserStatus,
} from "@prisma/client";

interface CreateLeadOptions {
  assignedAt?: Date;
  assignedById?: string;
  assignedToId?: string;
}

interface QualifiedProspectMeta {
  id: string;
  prospectNo: string;
  isNew: boolean;
}

interface UpdateLeadStatusResult {
  lead: Lead;
  message: string;
  prospect?: QualifiedProspectMeta;
}

const toEnumFilter = <T extends string>(value?: T | T[]) => {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? { in: value } : value;
};

const isUniqueConstraintError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

const getUniqueErrorTarget = (error: unknown) => {
  if (!isUniqueConstraintError(error)) {
    return [];
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.map(String);
  }
  if (typeof target === "string") {
    return [target];
  }

  return [];
};

const uniqueErrorTargetsField = (error: unknown, field: string) => {
  return getUniqueErrorTarget(error).some((target) => target === field);
};

const controlledUniqueError = (error: unknown) => {
  const target = getUniqueErrorTarget(error).join(", ");
  return AppError.database.constraintViolation(target || undefined);
};

async function createLead(
  data: CreateLeadInput,
  user: SafeUser,
  organizationId: string,
  options: CreateLeadOptions = {},
): Promise<Lead> {
  const {
    assignedToId: assignedToIdFromData,
    status: createStatus,
    source,
    industry,
    leadType,
    productInterested,
    ...rest
  } = data;

  const {
    assignedAt: optAssignedAt,
    assignedById: optAssignedById,
    assignedToId: optAssignedToId,
  } = options;

  let resolvedAssignedToId =
    optAssignedToId ?? assignedToIdFromData ?? undefined;

  if (user.role === ROLES.EXECUTIVE) {
    if (resolvedAssignedToId && resolvedAssignedToId !== user.id) {
      throw AppError.authorization.forbidden(
        "Executives can only assign leads to themselves",
      );
    }
    resolvedAssignedToId = user.id;
  } else if (user.role === ROLES.MANAGER) {
    if (!resolvedAssignedToId) {
      resolvedAssignedToId = user.id;
    }
  }

  if (resolvedAssignedToId) {
    await validateLeadAssignee(resolvedAssignedToId, organizationId, user);
  }

  // Plan limit: refuse once the org has reached its MAX_LEADS ceiling.
  await assertWithinLimit(organizationId, "MAX_LEADS", billingRepository.countLeads);

  if (productInterested) {
    const item = await itemRepository.findActiveItemById(productInterested, organizationId);
    if (!item) {
      throw AppError.validation.badRequest("Invalid or inactive product selected for product interest.");
    }
  }

  const assignedById =
    optAssignedById ?? (resolvedAssignedToId ? user.id : undefined);
  const assignedAt =
    optAssignedAt ?? (resolvedAssignedToId ? new Date() : undefined);

  const lead = await leadRepository.createLeadWithGeneratedNumber(
    organizationId,
    {
      ...rest,
      source,
      industry,
      leadType,
      status: createStatus,
      organizationId,
      createdById: user.id,
      assignedToId: resolvedAssignedToId,
      assignedById,
      assignedAt,
      productInterestId: productInterested,
    },
  );

  return toLeadDTO(lead);
}

async function updateLead(
  id: string,
  data: UpdateLeadInput,
  user: SafeUser,
  organizationId: string,
): Promise<Lead> {
  const existingLead = await leadRepository.findLeadById(id, organizationId);
  if (!existingLead) {
    throw AppError.resource.notFound("Lead");
  }

  ensureOwnership(user, existingLead);
  ensureEditableLead(existingLead);

  const {
    assignedToId: assignedToIdIn,
    status: updateStatus,
    source,
    industry,
    leadType,
    productInterested,
    ...rest
  } = data;

  const isExecutive = user.role === ROLES.EXECUTIVE;

  if (
    isExecutive &&
    assignedToIdIn !== undefined &&
    assignedToIdIn !== user.id
  ) {
    throw AppError.authorization.forbidden(
      "Executives can only assign leads to themselves",
    );
  }

  if (updateStatus) {
    ensureStatusChangeAllowed(existingLead, user);
    logger.info("Lead status changing via update", {
      leadId: id,
      oldStatus: existingLead.status,
      newStatus: updateStatus,
      userId: user.id,
    });
  }

  if (assignedToIdIn) {
    await validateLeadAssignee(assignedToIdIn, organizationId, user);
  }

  if (productInterested) {
    const item = await itemRepository.findActiveItemById(productInterested, organizationId);
    if (!item) {
      throw AppError.validation.badRequest("Invalid or inactive product selected for product interest.");
    }
  }

  const isChangingAssignee =
    assignedToIdIn !== undefined &&
    assignedToIdIn !== existingLead.assignedToId;

  const lead = await leadRepository.updateLead(
    id,
    {
      ...rest,
      source,
      industry,
      leadType,
      status: updateStatus,
      assignedToId: assignedToIdIn,
      productInterestId: productInterested,
      ...(isChangingAssignee && {
        assignedById: user.id,
        assignedAt: new Date(),
      }),
    },
    organizationId,
  );

  if (!lead) {
    throw AppError.resource.notFound("Lead");
  }

  return toLeadDTO(lead);
}

async function softDeleteLead(
  id: string,
  user: SafeUser,
  organizationId: string,
) {
  if (user.role === ROLES.EXECUTIVE) {
    throw AppError.authorization.forbidden("Not allowed to delete lead");
  }

  const existingLead = await leadRepository.findLeadById(id, organizationId);
  if (!existingLead) {
    throw AppError.resource.notFound("Lead");
  }

  ensureOwnership(user, existingLead);
  ensureEditableLead(existingLead);

  await leadRepository.softDeleteLead(id, organizationId, user.id);
}

async function assignLead(
  id: string,
  executiveId: string,
  assignedByIdIn: string,
  user: SafeUser,
  organizationId: string,
): Promise<Lead> {
  const existingLead = await leadRepository.findLeadById(id, organizationId);
  if (!existingLead) {
    throw AppError.resource.notFound("Lead");
  }

  ensureOwnership(user, existingLead);
  ensureEditableLead(existingLead);

  await validateLeadAssignee(executiveId, organizationId, user);

  const lead = await leadRepository.assignLead(
    id,
    executiveId,
    assignedByIdIn,
    organizationId,
  );

  if (!lead) {
    throw AppError.resource.notFound("Lead");
  }

  return toLeadDTO(lead);
}

async function getLeads(
  params: LeadFilterInput,
  user: SafeUser,
  organizationId: string,
) {
  const {
    source,
    industry,
    status,
    productInterested,
    assignedToId,
    search,
    page,
    limit,
  } = params;

  const where: Prisma.LeadWhereInput = {
    organizationId,
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { leadNo: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = toEnumFilter(
      status as PrismaLeadStatus | PrismaLeadStatus[],
    );
  }

  if (source) {
    where.source = toEnumFilter(
      source as PrismaLeadSource | PrismaLeadSource[],
    );
  }

  if (industry) {
    where.industry = toEnumFilter(
      industry as PrismaIndustry | PrismaIndustry[],
    );
  }

  if (productInterested) {
    where.productInterestId = Array.isArray(productInterested)
      ? { in: productInterested }
      : productInterested;
  }

  if (assignedToId) {
    where.assignedToId = Array.isArray(assignedToId)
      ? { in: assignedToId }
      : assignedToId;
  }

  if (user.role === ROLES.EXECUTIVE) {
    const requestedAssignedToIds = Array.isArray(assignedToId)
      ? assignedToId
      : assignedToId
        ? [assignedToId]
        : [];

    if (
      requestedAssignedToIds.length > 0 &&
      !requestedAssignedToIds.includes(user.id)
    ) {
      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    where.assignedToId = user.id;
  } else if (user.role === ROLES.MANAGER) {
    where.assignedTo = {
      OR: [
        { id: user.id },
        { managerId: user.id },
      ],
    };
  }

  const leads = await leadRepository.getLeads(where, { page, limit });

  return {
    ...leads,
    data: leads.data.map(toLeadDTO),
  };
}

async function getLeadById(
  id: string,
  user: SafeUser,
  organizationId: string,
): Promise<Lead> {
  const existingLead = await leadRepository.getLeadById(id, organizationId);
  if (!existingLead) {
    throw AppError.resource.notFound("Lead");
  }

  ensureOwnership(user, existingLead);

  return toLeadDTO(existingLead);
}

async function updateLeadStatus(
  id: string,
  data: UpdateLeadStatusInput,
  user: SafeUser,
  organizationId: string,
): Promise<UpdateLeadStatusResult> {
  const existingLead = await leadRepository.findLeadById(id, organizationId);
  if (!existingLead) {
    throw AppError.resource.notFound("Lead");
  }

  ensureOwnership(user, existingLead);
  ensureEditableLead(existingLead);
  ensureStatusChangeAllowed(existingLead, user);

  logger.info("Lead status updating", {
    leadId: id,
    oldStatus: existingLead.status,
    newStatus: data.status,
    userId: user.id,
  });

  if (data.status === PrismaLeadStatus.QUALIFIED) {
    const runQualification = async () =>
      prisma.$transaction(async (tx: DB): Promise<UpdateLeadStatusResult> => {
        const existingProspect = await prospectRepository.findByLeadId(
          id,
          organizationId,
          tx,
        );

        if (existingProspect) {
          const lead = await tx.lead.update({
            where: { id },
            data: {
              status: PrismaLeadStatus.QUALIFIED,
              convertedAt: existingLead.convertedAt ?? new Date(),
              convertedById: existingLead.convertedById ?? user.id,
            },
            include: leadInclude,
          });

          return {
            lead: toLeadDTO(lead),
            message: "Lead qualified and converted to prospect",
            prospect: {
              id: existingProspect.id,
              prospectNo: existingProspect.prospectNo,
              isNew: false,
            },
          };
        }

        await prospectRepository.unlinkDeletedProspect(id, organizationId, tx);

        await assertWithinLimit(
          organizationId,
          "MAX_PROSPECTS",
          billingRepository.countProspects,
          tx,
        );

        const convertedAt = new Date();
        await tx.lead.update({
          where: { id },
          data: {
            status: PrismaLeadStatus.QUALIFIED,
            convertedAt,
            convertedById: user.id,
          },
        });

        const prospect = await prospectRepository.createWithGeneratedNumber(
          organizationId,
          {
            lead: { connect: { id } },
            organization: { connect: { id: organizationId } },
            stage: ProspectStage.REQUIREMENT,
            assignedTo: existingLead.assignedToId
              ? { connect: { id: existingLead.assignedToId } }
              : undefined,
          },
          tx,
        );

        await prospectRepository.createActivity(
          {
            prospectId: prospect.id,
            type: ProspectActivityType.CONVERSION,
            title: "Lead converted",
            summary: `Converted from lead ${existingLead.leadNo}`,
            details: `Prospect ${prospect.prospectNo} created from lead ${existingLead.leadNo}.`,
            metadata: {
              sourceLeadId: existingLead.id,
              sourceLeadNo: existingLead.leadNo,
            },
            createdById: user.id,
          },
          tx,
        );

        const lead = await tx.lead.findFirst({
          where: { id, organizationId, deletedAt: null },
          include: leadInclude,
        });

        if (!lead) {
          throw AppError.resource.notFound("Lead");
        }

        return {
          lead: toLeadDTO(lead),
          message: "Lead qualified and converted to prospect",
          prospect: {
            id: prospect.id,
            prospectNo: prospect.prospectNo,
            isNew: true,
          },
        };
      });

    try {
      return await runQualification();
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const target = getUniqueErrorTarget(error);
      logger.warn("Lead qualification hit unique constraint", {
        leadId: id,
        leadNo: existingLead.leadNo,
        organizationId,
        userId: user.id,
        prismaCode: "P2002",
        target,
      });

      const existingProspect = await prospectRepository.findByLeadId(
        id,
        organizationId,
      );

      if (uniqueErrorTargetsField(error, "leadId") && existingProspect) {
        return prisma.$transaction(async (tx: DB) => {
          const lead = await tx.lead.update({
            where: { id },
            data: {
              status: PrismaLeadStatus.QUALIFIED,
              convertedAt: existingLead.convertedAt ?? new Date(),
              convertedById: existingLead.convertedById ?? user.id,
            },
            include: leadInclude,
          });

          return {
            lead: toLeadDTO(lead),
            message: "Lead qualified and converted to prospect",
            prospect: {
              id: existingProspect.id,
              prospectNo: existingProspect.prospectNo,
              isNew: false,
            },
          };
        });
      }

      if (uniqueErrorTargetsField(error, "prospectNo")) {
        try {
          return await runQualification();
        } catch (retryError) {
          if (!isUniqueConstraintError(retryError)) {
            throw retryError;
          }
          logger.warn("Lead qualification prospect number retry failed", {
            leadId: id,
            leadNo: existingLead.leadNo,
            organizationId,
            userId: user.id,
            prismaCode: "P2002",
            target: getUniqueErrorTarget(retryError),
          });
          throw controlledUniqueError(retryError);
        }
      }

      throw controlledUniqueError(error);
    }
  }

  const lead = await leadRepository.updateLead(
    id,
    {
      status: data.status as PrismaLeadStatus,
    },
    organizationId,
  );

  if (!lead) {
    throw AppError.resource.notFound("Lead");
  }

  return {
    lead: toLeadDTO(lead),
    message: "Lead status updated successfully",
  };
}

async function convertLeadToProspect(
  id: string,
  data: Omit<ConvertLeadToProspectInput, "leadId">,
  user: SafeUser,
  organizationId: string,
) {
  const existingLead = await leadRepository.findLeadById(id, organizationId);
  if (!existingLead) {
    throw AppError.resource.notFound("Lead");
  }

  ensureOwnership(user, existingLead);
  ensureEditableLead(existingLead);
  ensureStatusChangeAllowed(existingLead, user);

  if (existingLead.status !== "QUALIFIED") {
    throw AppError.validation.badRequest(
      "Only qualified leads can be converted to prospects",
    );
  }

  logger.info("Converting lead to prospect", {
    leadId: id,
    userId: user.id,
    status: existingLead.status,
  });

  return prospectService.convertLeadToProspect(
    { leadId: id, ...data },
    user,
    organizationId,
  );
}

async function getAssignableUsers(user: SafeUser, organizationId: string) {
  const where: Prisma.UserWhereInput = {
    organizationId,
    status: UserStatus.ACTIVE,
  };

  if (user.role === ROLES.EXECUTIVE) {
    where.id = user.id;
  } else if (user.role === ROLES.MANAGER) {
    where.OR = [{ id: user.id }, { role: ROLES.EXECUTIVE }];
  }

  return userRepository.findMany(where);
}

export const leadService = {
  assignLead,
  convertLeadToProspect,
  createLead,
  getLeadById,
  getLeads,
  getAssignableUsers,
  importLeads,
  softDeleteLead,
  updateLeadStatus,
  updateLead,
};
