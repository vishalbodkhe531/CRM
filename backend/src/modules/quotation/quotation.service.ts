import { Prisma, QuotationStatus } from "@prisma/client";
import { ROLES } from "../../constants/roles";
import type {
  CreateQuotationInput,
  QuotationFilterInput,
  UpdateQuotationInput,
} from "../../contracts/validation";
import type { Quotation } from "../../contracts/types";
import type { SafeUser } from "../../types/user.types";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/errors/appError";
import { ensureOwnership } from "../../utils/security/ownership.utils";
import { itemRepository } from "../item/item.repository";
import { prospectRepository } from "../prospect/prospect.repository";
import { prospectService } from "../prospect/prospect.service";
import { userRepository } from "../user/user.repository";
import { calculateQuotation } from "./quotation.calculator";
import { quotationRepository } from "./quotation.repository";
import { billingRepository } from "../billing/billing.repository";
import { assertWithinLimit } from "../billing/limit.guard";

type QuotationRecord = Record<string, any>;

export function toQuotationDTO(quotation: QuotationRecord | null): Quotation {
  if (!quotation) return null as any;

  const {
    date,
    details,
    createdAt,
    updatedAt,
    deletedAt,
    deletedById,
    subtotal,
    taxTotal,
    tdsAmount,
    roundOff,
    grandTotal,
    approvedAt,
    rejectedAt,
    statusHistory,
    ...rest
  } = quotation;

  return {
    ...rest,
    date:
      date instanceof Date
        ? date.toISOString().split("T")[0]
        : new Date(date).toISOString().split("T")[0],
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    approvedAt: approvedAt?.toISOString() ?? null,
    rejectedAt: rejectedAt?.toISOString() ?? null,
    subtotal: Number(subtotal ?? details?.subtotal ?? 0),
    taxTotal: Number(taxTotal ?? details?.taxTotal ?? 0),
    tdsAmount: Number(tdsAmount ?? details?.tdsAmount ?? 0),
    roundOff: Number(roundOff ?? details?.roundOff ?? 0),
    grandTotal: Number(grandTotal ?? details?.grandTotal ?? 0),
    details: details ? (details as any) : null,
    ...(statusHistory
      ? {
          statusHistory: statusHistory.map((entry: QuotationRecord) => ({
            ...entry,
            changedAt: entry.changedAt.toISOString(),
          })),
        }
      : {}),
  } as Quotation;
}

const toEnumFilter = <T extends string>(value?: T | T[]) => {
  if (!value) return undefined;
  return Array.isArray(value) ? { in: value } : value;
};

const normalizeOptionalId = (value: string | null | undefined) =>
  value === "" ? null : value;

const hasContentChanges = (data: UpdateQuotationInput) =>
  [
    "assignedToId",
    "partyName",
    "contactPerson",
    "refNo",
    "date",
    "details",
    "prospectId",
  ].some((field) => data[field as keyof UpdateQuotationInput] !== undefined);

function buildVisibilityWhere(user: SafeUser): Prisma.QuotationWhereInput | undefined {
  if (user.role === ROLES.EXECUTIVE) {
    return {
      OR: [{ assignedToId: user.id }, { createdById: user.id }],
    };
  }

  if (user.role === ROLES.MANAGER) {
    return {
      OR: [
        { assignedToId: user.id },
        { createdById: user.id },
        { assignedTo: { managerId: user.id } },
      ],
    };
  }

  return undefined;
}

async function validateAssignee(
  assignedToId: string | null | undefined,
  user: SafeUser,
  organizationId: string,
) {
  if (!assignedToId) return;

  const assignee = await userRepository.findById(assignedToId, organizationId, {
    id: true,
    status: true,
    managerId: true,
  });

  if (!assignee || assignee.status !== "ACTIVE") {
    throw AppError.validation.badRequest("Invalid assignee or assignee is inactive");
  }

  if (
    user.role === ROLES.MANAGER &&
    assignee.id !== user.id &&
    assignee.managerId !== user.id
  ) {
    throw AppError.authorization.forbidden(
      "Managers can only assign quotations to themselves or their direct reports",
    );
  }
}

async function validateProspect(
  prospectId: string | null | undefined,
  organizationId: string,
) {
  if (!prospectId) return null;

  const prospect = await prospectRepository.findById(prospectId, organizationId);
  if (!prospect || !prospect.lead || prospect.lead.deletedAt) {
    throw AppError.validation.badRequest(
      "Invalid prospect, inactive prospect, or prospect belongs to another organization",
    );
  }

  return prospect;
}

async function calculateTrustedDetails(
  details: CreateQuotationInput["details"],
  organizationId: string,
) {
  const uniqueItemIds = [...new Set(details.items.map((item) => item.itemId))];
  const items = await itemRepository.findActiveItemsByIds(uniqueItemIds, organizationId);

  if (items.length !== uniqueItemIds.length) {
    throw AppError.validation.badRequest(
      "One or more quotation items are inactive, invalid, or belong to another organization",
    );
  }

  try {
    return calculateQuotation(
      details,
      new Map(items.map((item) => [item.id, item])),
    );
  } catch (error) {
    throw AppError.validation.badRequest(
      error instanceof Error ? error.message : "Invalid quotation totals",
    );
  }
}

function assertStatusTransition(
  existing: QuotationRecord,
  targetStatus: QuotationStatus,
  statusReason: string | undefined,
  user: SafeUser,
) {
  if (targetStatus === existing.status) return;

  if (user.role === ROLES.EXECUTIVE) {
    throw AppError.authorization.forbidden(
      "Executives cannot approve or reject quotations",
    );
  }

  if (
    user.role === ROLES.MANAGER &&
    (existing.createdById === user.id || existing.assignedToId === user.id)
  ) {
    throw AppError.authorization.forbidden(
      "Managers cannot approve or reject their own quotations",
    );
  }

  const allowedTransitions: Record<QuotationStatus, QuotationStatus[]> = {
    PENDING: [QuotationStatus.APPROVED, QuotationStatus.REJECTED],
    REJECTED: [QuotationStatus.PENDING],
    APPROVED:
      user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN
        ? [QuotationStatus.PENDING]
        : [],
  };

  if (!allowedTransitions[existing.status as QuotationStatus].includes(targetStatus)) {
    throw AppError.business.stateConflict(
      `Quotation status cannot change from ${existing.status} to ${targetStatus}`,
    );
  }

  if (targetStatus === QuotationStatus.REJECTED && !statusReason?.trim()) {
    throw AppError.validation.badRequest("A rejection reason is required");
  }
}

async function createQuotation(
  data: CreateQuotationInput,
  user: SafeUser,
  organizationId: string,
): Promise<Quotation> {
  if (!organizationId) {
    throw AppError.validation.badRequest(
      "An organization scope is required to create a quotation",
    );
  }

  const { assignedToId, details, prospectId, ...rest } = data;
  let resolvedAssignedToId = normalizeOptionalId(assignedToId);
  const resolvedProspectId = normalizeOptionalId(prospectId);

  if (user.role === ROLES.EXECUTIVE) {
    if (resolvedAssignedToId && resolvedAssignedToId !== user.id) {
      throw AppError.authorization.forbidden(
        "Executives can only assign quotations to themselves",
      );
    }
    resolvedAssignedToId = user.id;
  }

  await Promise.all([
    validateAssignee(resolvedAssignedToId, user, organizationId),
    validateProspect(resolvedProspectId, organizationId),
  ]);

  // Plan limit: refuse once the org reaches its MAX_QUOTATIONS ceiling.
  await assertWithinLimit(
    organizationId,
    "MAX_QUOTATIONS",
    billingRepository.countQuotations,
  );

  const calculated = await calculateTrustedDetails(details, organizationId);

  const quotation = await quotationRepository.createQuotationWithGeneratedNumber(
    organizationId,
    user.id,
    {
      ...rest,
      status: QuotationStatus.PENDING,
      assignedToId: resolvedAssignedToId,
      prospectId: resolvedProspectId,
      details: calculated.details,
      ...calculated.totals,
    },
  );

  if (resolvedProspectId) {
    try {
      await prospectService.logQuotationActivity(
        resolvedProspectId,
        "QUOTATION_CREATED",
        {
          id: quotation.id,
          quotationNo: quotation.quotationNo,
          refNo: quotation.refNo,
        },
        user.id,
      );
    } catch (error) {
      logger.error("Failed to log quotation creation activity", error);
    }
  }

  return toQuotationDTO(quotation);
}

async function updateQuotation(
  id: string,
  data: UpdateQuotationInput,
  user: SafeUser,
  organizationId: string,
): Promise<Quotation> {
  const existingQuotation = await quotationRepository.findQuotationById(
    id,
    organizationId,
  );
  if (!existingQuotation) {
    throw AppError.resource.notFound("Quotation");
  }

  ensureOwnership(user, existingQuotation);

  if (
    data.expectedVersion !== undefined &&
    data.expectedVersion !== existingQuotation.version
  ) {
    throw AppError.business.stateConflict(
      "This quotation was changed by another user. Refresh and try again.",
    );
  }

  const targetStatus = data.status as QuotationStatus | undefined;
  const statusIsChanging = targetStatus && targetStatus !== existingQuotation.status;

  if (
    (existingQuotation.status === QuotationStatus.APPROVED ||
      existingQuotation.status === QuotationStatus.REJECTED) &&
    hasContentChanges(data)
  ) {
    throw AppError.business.stateConflict(
      "Approved and rejected quotations are immutable. Return it to PENDING before editing.",
    );
  }

  if (
    statusIsChanging &&
    (targetStatus === QuotationStatus.APPROVED ||
      targetStatus === QuotationStatus.REJECTED) &&
    hasContentChanges(data)
  ) {
    throw AppError.validation.badRequest(
      "Approval and rejection must be submitted separately from content changes",
    );
  }

  if (targetStatus) {
    assertStatusTransition(existingQuotation, targetStatus, data.statusReason, user);
  }

  let resolvedAssignedToId = normalizeOptionalId(data.assignedToId);
  const resolvedProspectId =
    data.prospectId === undefined
      ? undefined
      : normalizeOptionalId(data.prospectId);

  if (user.role === ROLES.EXECUTIVE && data.assignedToId !== undefined) {
    if (resolvedAssignedToId !== user.id) {
      throw AppError.authorization.forbidden(
        "Executives can only assign quotations to themselves",
      );
    }
  }

  await Promise.all([
    data.assignedToId !== undefined
      ? validateAssignee(resolvedAssignedToId, user, organizationId)
      : Promise.resolve(),
    data.prospectId !== undefined
      ? validateProspect(resolvedProspectId, organizationId)
      : Promise.resolve(),
  ]);

  const calculated = data.details
    ? await calculateTrustedDetails(data.details, organizationId)
    : undefined;

  const updateData: Record<string, unknown> = {
    ...(targetStatus && { status: targetStatus }),
    ...(data.assignedToId !== undefined && {
      assignedToId: resolvedAssignedToId,
    }),
    ...(data.partyName !== undefined && { partyName: data.partyName }),
    ...(data.contactPerson !== undefined && {
      contactPerson: data.contactPerson,
    }),
    ...(data.refNo !== undefined && { refNo: data.refNo }),
    ...(data.date !== undefined && { date: data.date }),
    ...(calculated && {
      details: calculated.details,
      ...calculated.totals,
    }),
    ...(data.prospectId !== undefined && { prospectId: resolvedProspectId }),
  };

  if (statusIsChanging && targetStatus === QuotationStatus.APPROVED) {
    Object.assign(updateData, {
      approvedAt: new Date(),
      approvedById: user.id,
      rejectedAt: null,
      rejectedById: null,
      rejectionReason: null,
    });
  } else if (statusIsChanging && targetStatus === QuotationStatus.REJECTED) {
    Object.assign(updateData, {
      rejectedAt: new Date(),
      rejectedById: user.id,
      rejectionReason: data.statusReason?.trim(),
      approvedAt: null,
      approvedById: null,
    });
  } else if (statusIsChanging && targetStatus === QuotationStatus.PENDING) {
    Object.assign(updateData, {
      approvedAt: null,
      approvedById: null,
      rejectedAt: null,
      rejectedById: null,
      rejectionReason: null,
    });
  }

  let updated;
  try {
    updated = await quotationRepository.updateQuotation(
      id,
      updateData,
      organizationId,
      {
        expectedVersion: data.expectedVersion,
        ...(statusIsChanging && targetStatus
          ? {
              statusChange: {
                fromStatus: existingQuotation.status,
                toStatus: targetStatus,
                reason: data.statusReason?.trim(),
                changedById: user.id,
              },
            }
          : {}),
      },
    );
  } catch (error) {
    if (
      data.expectedVersion !== undefined &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw AppError.business.stateConflict(
        "This quotation was changed by another user. Refresh and try again.",
      );
    }
    throw error;
  }

  const activeProspectId =
    resolvedProspectId !== undefined
      ? resolvedProspectId
      : existingQuotation.prospectId;
  if (activeProspectId) {
    try {
      await prospectService.logQuotationActivity(
        activeProspectId,
        "QUOTATION_UPDATED",
        {
          id: updated.id,
          quotationNo: updated.quotationNo,
          refNo: updated.refNo,
        },
        user.id,
      );
    } catch (error) {
      logger.error("Failed to log quotation update activity", error);
    }
  }

  return toQuotationDTO(updated);
}

function buildQuotationWhere(
  params: QuotationFilterInput,
  user: SafeUser,
  organizationId: string,
): Prisma.QuotationWhereInput {
  const where: Prisma.QuotationWhereInput = {
    ...(organizationId ? { organizationId } : {}),
    deletedAt: null,
  };
  const andFilters: Prisma.QuotationWhereInput[] = [];

  if (params.search) {
    andFilters.push({
      OR: [
        { quotationNo: { contains: params.search, mode: "insensitive" } },
        { partyName: { contains: params.search, mode: "insensitive" } },
        { contactPerson: { contains: params.search, mode: "insensitive" } },
        { refNo: { contains: params.search, mode: "insensitive" } },
      ],
    });
  }

  if (params.status) {
    where.status = toEnumFilter(
      params.status as QuotationStatus | QuotationStatus[],
    );
  }

  if (params.assignedToId) {
    where.assignedToId = Array.isArray(params.assignedToId)
      ? { in: params.assignedToId }
      : params.assignedToId;
  }

  if (params.createdFrom || params.createdTo) {
    where.createdAt = {};
    if (params.createdFrom) {
      where.createdAt.gte = new Date(`${params.createdFrom}T00:00:00.000Z`);
    }
    if (params.createdTo) {
      where.createdAt.lte = new Date(`${params.createdTo}T23:59:59.999Z`);
    }
  }

  const visibilityWhere = buildVisibilityWhere(user);
  if (visibilityWhere) andFilters.push(visibilityWhere);
  if (andFilters.length > 0) where.AND = andFilters;

  return where;
}

async function getQuotations(
  params: QuotationFilterInput,
  user: SafeUser,
  organizationId: string,
) {
  const where = buildQuotationWhere(params, user, organizationId);
  const result = await quotationRepository.getQuotations(where, {
    page: params.page,
    limit: params.limit,
  });

  return {
    ...result,
    data: result.data.map(toQuotationDTO),
  };
}

async function getQuotationStats(user: SafeUser, organizationId: string) {
  return quotationRepository.getQuotationStats({
    ...(organizationId ? { organizationId } : {}),
    deletedAt: null,
    ...(buildVisibilityWhere(user) ?? {}),
  });
}

async function getQuotationById(
  id: string,
  user: SafeUser,
  organizationId: string,
): Promise<Quotation> {
  const quotation = await quotationRepository.getQuotationById(id, organizationId);
  if (!quotation) {
    throw AppError.resource.notFound("Quotation");
  }

  ensureOwnership(user, quotation);
  return toQuotationDTO(quotation);
}

async function softDeleteQuotation(
  id: string,
  user: SafeUser,
  organizationId: string,
) {
  if (user.role === ROLES.EXECUTIVE) {
    throw AppError.authorization.forbidden("Not allowed to delete quotation");
  }

  const existingQuotation = await quotationRepository.findQuotationById(
    id,
    organizationId,
  );
  if (!existingQuotation) {
    throw AppError.resource.notFound("Quotation");
  }

  ensureOwnership(user, existingQuotation);
  if (existingQuotation.status === QuotationStatus.APPROVED) {
    throw AppError.business.stateConflict(
      "Approved quotations cannot be deleted. Return it to PENDING first.",
    );
  }

  await quotationRepository.softDeleteQuotation(id, organizationId, user.id);
}

export const quotationService = {
  createQuotation,
  updateQuotation,
  getQuotations,
  getQuotationStats,
  getQuotationById,
  softDeleteQuotation,
};
