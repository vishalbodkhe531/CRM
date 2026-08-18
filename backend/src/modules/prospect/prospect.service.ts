import {
  LeadStatus,
  Prisma,
  ProspectActivityType,   
  ProspectReminder,   
  ProspectStage,
  ProspectFollowUpType,
  Role,
} from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/errors/appError";
import { ensureOwnership } from "../../utils/security/ownership.utils";
import { parseOptionalDate } from "../../utils/validation";
import { leadRepository } from "../lead/lead.repository";
import { billingRepository } from "../billing/billing.repository";
import { assertWithinLimit } from "../billing/limit.guard";
import { validateLeadAssignee } from "../lead/lead.validation";
import { prospectRepository } from "./prospect.repository";
import type { SafeUser } from "../../types/user.types";
import type {
  ConvertLeadToProspectInput,
  CreateProspectActivityInput,
  ProspectFilterInput,
  UpdateProspectFollowUpInput,
  UpdateProspectInput,
  UpdateProspectStageInput,
} from "../../contracts/validation";
import type {
  ConvertLeadToProspectResult,
  Prospect,
  ProspectActivity,
  ProspectAssignee,
  ProspectFollowUp,
  ProspectLeadPreview,
} from "../../contracts/types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const isTerminalStage = (stage: ProspectStage | Prospect["stage"]) => {
  return stage === "WON" || stage === "LOST";
};

const getProspectStatus = (
  stage: ProspectStage | Prospect["stage"],
): Prospect["status"] => {
  if (stage === "WON") {
    return "WON";
  }

  if (stage === "LOST") {
    return "LOST";
  }

  return "ACTIVE";
};

// const getFollowUpHealth = (prospect: {
//   stage: Prospect["stage"];
//   createdAt: Date;
//   followUpDate: Date | null;
// }): Prospect["followUpHealth"] => {
//   if (getProspectStatus(prospect.stage) !== "ACTIVE") {
//     return "NONE";
//   }

//   if (prospect.followUpDate) {
//     return "OK";
//   }

//   const ageInDays = Math.floor(
//     (Date.now() - prospect.createdAt.getTime()) / DAY_IN_MS,
//   );

//   if (ageInDays > 14) {
//     return "OVERDUE";
//   }

//   if (ageInDays > 7) {
//     return "WARNING";
//   }

//   return "NONE";
// };

// For the testing
// const getFollowUpHealth = (prospect: {
//   stage: Prospect["stage"];
//   followUpDate: Date | null;
//   followUpTime?: string | null;
// }): Prospect["followUpHealth"] => {
//   if (getProspectStatus(prospect.stage) !== "ACTIVE") {
//     return "NONE";
//   }

//   if (!prospect.followUpDate || !prospect.followUpTime) {
//     return "NONE";
//   }

//   const followUpAt = new Date(prospect.followUpDate);

//   const [hours, minutes] = prospect.followUpTime.split(":").map(Number);

//   followUpAt.setHours(hours, minutes, 0, 0);

//   const now = new Date();

//   const diffMinutes = (followUpAt.getTime() - now.getTime()) / (1000 * 60);

//   if (diffMinutes < -1) {
//     return "OVERDUE";
//   }

//   if (diffMinutes <= 1) {
//     return "WARNING";
//   }

//   return "OK";
// };

const getFollowUpHealth = (prospect: {
  stage: Prospect["stage"];
  followUpDate: Date | null;
  followUpTime?: string | null;
}): Prospect["followUpHealth"] => {
  if (getProspectStatus(prospect.stage) !== "ACTIVE") {
    return "NONE";
  }

  if (!prospect.followUpDate || !prospect.followUpTime) {
    return "NONE";
  }

  const followUpAt = new Date(prospect.followUpDate);

  const [hours, minutes] = prospect.followUpTime.split(":").map(Number);

  followUpAt.setHours(hours, minutes, 0, 0);

  const now = new Date();

  const diffMinutes = (followUpAt.getTime() - now.getTime()) / (1000 * 60);

  if (diffMinutes < -5) {
    return "OVERDUE";
  }

  if (diffMinutes <= 5) {
    return "WARNING";
  }

  return "OK";
};

const getActivityFollowUpHealth = (
  followUpDate?: string | null,
  followUpTime?: string | null,
): Prospect["followUpHealth"] => {
  if (!followUpDate || !followUpTime) {
    return "NONE";
  }

  const followUpAt = new Date(followUpDate);

  const [hours, minutes] = followUpTime.split(":").map(Number);

  followUpAt.setHours(hours, minutes, 0, 0);

  const now = new Date();

  const diffMinutes = (followUpAt.getTime() - now.getTime()) / (1000 * 60);

  if (diffMinutes < -5) {
    return "OVERDUE";
  }

  if (diffMinutes <= 5) {
    return "WARNING";
  }

  return "OK";
};

const parseDateOnlyStart = (value?: string) => {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`);
};

const parseDateOnlyEnd = (value?: string) => {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T23:59:59.999Z`);
};

const assertProspectAccess = (
  user: SafeUser,
  prospect: {
    assignedToId: string | null;
    assignedTo?: { managerId?: string | null } | null;
  },
) => {
  ensureOwnership(user, prospect);
};

const assertEditableProspect = (prospect: { stage: Prospect["stage"] }) => {
  if (isTerminalStage(prospect.stage)) {
    throw AppError.business.stateConflict(
      "Won or lost prospects are read-only",
    );
  }
};

const validateProspectAssignee = async (
  assigneeId: string,
  organizationId: string,
  user: SafeUser,
) => {
  await validateLeadAssignee(assigneeId, organizationId, user);
};

const assertFollowUpDateIsTodayOrFuture = (date?: string | null) => {
  if (!date) {
    return;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  const today = new Date();
  const startOfToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  if (parsed.getTime() < startOfToday.getTime()) {
    throw AppError.validation.badRequest(
      "Next follow-up date must be today or a future date",
    );
  }
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

const mapProspectAssignee = (
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    managerId?: string | null;
  } | null,
): ProspectAssignee | null => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    managerId: user.managerId ?? null,
  };
};

const mapProspectLead = (
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    companyName: string | null;
    gstin?: string | null;
    leadNo: string | null;
    mobile: string | null;
    alternateMobile?: string | null;
    website?: string | null;
    linkedInProfile?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pinCode?: string | null;
    source?: ProspectLeadPreview["source"];
    industry?: ProspectLeadPreview["industry"];
    leadType?: ProspectLeadPreview["leadType"];
    status?: LeadStatus | null;
    productInterestId?: string | null;
    productInterest?: ProspectLeadPreview["productInterest"];
    requiredDescription?: string | null;
    deletedAt?: Date | null;
  } | null,
): ProspectLeadPreview | undefined => {
  if (!lead) {
    return undefined;
  }

  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    companyName: lead.companyName,
    gstin: lead.gstin ?? null,
    leadNo: lead.leadNo,
    mobile: lead.mobile ?? undefined,
    alternateMobile: lead.alternateMobile ?? null,
    website: lead.website ?? null,
    linkedInProfile: lead.linkedInProfile ?? null,
    address: lead.address ?? null,
    city: lead.city ?? null,
    state: lead.state ?? null,
    pinCode: lead.pinCode ?? null,
    source: lead.source ?? null,
    industry: lead.industry ?? null,
    leadType: lead.leadType ?? null,
    status: lead.status ?? null,
    productInterested: lead.productInterestId ?? null,
    productInterest: lead.productInterest ?? null,
    requiredDescription: lead.requiredDescription ?? null,
    isActive: !lead.deletedAt,
  };
};

const mapFollowUp = (prospect: {
  followUpDate: Date | null;
  followUpTime?: string | null;
  followUpType?: ProspectFollowUpType | null;
  followUpNotes?: string | null;
  followUpReminder?: ProspectReminder | null;
  followUpAssignedToId?: string | null;
  followUpAssignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    managerId?: string | null;
  } | null;
}): ProspectFollowUp | null => {
  if (
    !prospect.followUpDate &&
    !prospect.followUpTime &&
    !prospect.followUpType &&
    !prospect.followUpNotes &&
    !prospect.followUpReminder &&
    !prospect.followUpAssignedToId
  ) {
    return null;
  }

  return {
    date: prospect.followUpDate?.toISOString() ?? null,
    time: prospect.followUpTime ?? null,
    type: prospect.followUpType ?? null,
    notes: prospect.followUpNotes ?? null,
    reminder: prospect.followUpReminder ?? null,
    assignedToId: prospect.followUpAssignedToId ?? null,
    assignedTo: mapProspectAssignee(prospect.followUpAssignedTo),
  };
};

const mapActivity = (activity: {
  id: string;
  type: ProspectActivityType;
  title: string;
  summary: string;
  details: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    managerId?: string | null;
  } | null;
}): ProspectActivity => {
  const metadata =
    activity.metadata &&
    typeof activity.metadata === "object" &&
    !Array.isArray(activity.metadata)
      ? (activity.metadata as Record<string, string | number | boolean | null>)
      : null;

  let activityFollowUpHealth: Prospect["followUpHealth"] | undefined;

  if (activity.type === "FOLLOW_UP_SET") {
    if (metadata?.completedHealth) {
      activityFollowUpHealth =
        metadata.completedHealth as Prospect["followUpHealth"];
    } else {
      activityFollowUpHealth = getActivityFollowUpHealth(
        metadata?.followUpDate as string | null,
        metadata?.followUpTime as string | null,
      );
    }
  }

  return {
    id: activity.id,
    type: activity.type,
    title: activity.title,
    summary: activity.summary,
    details: activity.details ?? null,
    metadata,
    createdAt: activity.createdAt.toISOString(),
    createdBy: mapProspectAssignee(activity.createdBy),
    followUpHealth: activityFollowUpHealth,
  };
};

const buildManualActivityContent = (data: CreateProspectActivityInput) => {
  const occurredAt = new Date(data.occurredAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (data.type === "CALL") {
    return {
      title: data.title,
      summary: `Call logged for ${occurredAt}`,
      details: data.notes ?? null,
      metadata: {
        occurredAt: data.occurredAt,
        outcome: data.outcome ?? null,
        durationMinutes: data.durationMinutes ?? null,
      },
    };
  }

  if (data.type === "MEETING") {
    return {
      title: data.title,
      summary: `Meeting logged for ${occurredAt}`,
      details: data.notes ?? null,
      metadata: {
        occurredAt: data.occurredAt,
        outcome: data.outcome ?? null,
        attendees: data.attendees ?? null,
      },
    };
  }

  return {
    title: data.title,
    summary: `Email placeholder logged for ${occurredAt}`,
    details: data.notes ?? null,
    metadata: {
      occurredAt: data.occurredAt,
      outcome: data.outcome ?? null,
    },
  };
};

export const prospectService = {
  mapProspectToResponse: (prospect: {
    id: string;
    prospectNo: string;
    leadId: string | null;
    organizationId: string;
    stage: Prospect["stage"];
    expectedValue: number | null;
    closeDate: Date | null;
    notes: string | null;
    assignedToId: string | null;
    createdAt: Date;
    updatedAt: Date;
    followUpDate: Date | null;
    followUpTime?: string | null;
    followUpType?: ProspectFollowUpType | null;
    followUpNotes?: string | null;
    followUpReminder?: ProspectReminder | null;
    followUpAssignedToId?: string | null;
    lead?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      companyName: string | null;
      leadNo: string | null;
      mobile: string | null;
      status?: LeadStatus | null;
    } | null;
    assignedTo?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      managerId?: string | null;
    } | null;
    followUpAssignedTo?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      managerId?: string | null;
    } | null;
    activities?: Array<{
      id: string;
      type: ProspectActivityType;
      title: string;
      summary: string;
      details: string | null;
      metadata: Prisma.JsonValue | null;
      createdAt: Date;
      createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        managerId?: string | null;
      } | null;
    }>;
  }): Prospect => {
    const health = getFollowUpHealth(prospect);

    return {
      id: prospect.id,
      prospectNo: prospect.prospectNo,
      leadId: prospect.leadId,
      organizationId: prospect.organizationId,
      stage: prospect.stage,
      status: getProspectStatus(prospect.stage),
      expectedValue: prospect.expectedValue,
      closeDate: prospect.closeDate?.toISOString() ?? null,
      notes: prospect.notes,
      assignedToId: prospect.assignedToId,
      createdAt: prospect.createdAt.toISOString(),
      updatedAt: prospect.updatedAt.toISOString(),
      lead: mapProspectLead(prospect.lead),
      assignedTo: mapProspectAssignee(prospect.assignedTo),
      followUp: mapFollowUp(prospect),
      activities: prospect.activities?.map(mapActivity) ?? [],

      followUpHealth: health,
      isTerminal: isTerminalStage(prospect.stage),
      isEditable: !isTerminalStage(prospect.stage),
    };
  },

  // getProspects: async (
  //   params: ProspectFilterInput,
  //   user: SafeUser,
  //   organizationId: string,
  // ): Promise<{
  //   data: Prospect[];
  //   meta: { page: number; limit: number; total: number; totalPages: number };
  // }> => {
  //   const requestedAssignedToIds = Array.isArray(params.assignedToId)
  //     ? params.assignedToId
  //     : params.assignedToId
  //       ? [params.assignedToId]
  //       : [];

  //   if (
  //     user.role === Role.EXECUTIVE &&
  //     requestedAssignedToIds.length > 0 &&
  //     !requestedAssignedToIds.includes(user.id)
  //   ) {
  //     return {
  //       data: [],
  //       meta: {
  //         page: params.page,
  //         limit: params.limit,
  //         total: 0,
  //         totalPages: 0,
  //       },
  //     };
  //   }

  //   const assignedToId =
  //     user.role === Role.EXECUTIVE ? user.id : params.assignedToId;

  //   const result = await prospectRepository.findAll({
  //     organizationId,
  //     stage: params.stage as ProspectStage | ProspectStage[] | undefined,
  //     assignedToId,
  //     search: params.search,
  //     createdFrom: parseDateOnlyStart(params.createdFrom),
  //     createdTo: parseDateOnlyEnd(params.createdTo),
  //     page: params.page,
  //     limit: params.limit,
  //   });

  //   return {
  //     ...result,
  //     data: result.data.map(prospectService.mapProspectToResponse),
  //   };
  // },

  getProspects: async (
    params: ProspectFilterInput,
    user: SafeUser,
    organizationId: string,
  ): Promise<{
    data: Prospect[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      missedFollowUps: number;
      followUpsDueToday: number;
    };
  }> => {
    const requestedAssignedToIds = Array.isArray(params.assignedToId)
      ? params.assignedToId
      : params.assignedToId
        ? [params.assignedToId]
        : [];

    if (
      user.role === Role.EXECUTIVE &&
      requestedAssignedToIds.length > 0 &&
      !requestedAssignedToIds.includes(user.id)
    ) {
      return {
        data: [],
        meta: {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 0,
          missedFollowUps: 0,
          followUpsDueToday: 0,
        },
      };
    }

    const assignedToId =
      user.role === Role.EXECUTIVE ? user.id : params.assignedToId;
    const managerId = user.role === Role.MANAGER ? user.id : undefined;

    // Run paginated fetch + overdue count in parallel
    const [result, missedFollowUps, followUpsDueToday] = await Promise.all([
      prospectRepository.findAll({
        organizationId,
        stage: params.stage as ProspectStage | ProspectStage[] | undefined,
        assignedToId,
        search: params.search,
        createdFrom: parseDateOnlyStart(params.createdFrom),
        createdTo: parseDateOnlyEnd(params.createdTo),
        page: params.page,
        limit: params.limit,
        status: params.status,
        managerId,
      }),
      prospectRepository.countOverdue(organizationId, assignedToId, managerId),
      prospectRepository.countDueToday(organizationId, assignedToId, managerId),
    ]);

    return {
      data: result.data.map(prospectService.mapProspectToResponse), // single map, no activities needed
      meta: {
        ...result.meta,
        missedFollowUps,
        followUpsDueToday,
      },
    };
  },

  convertLeadToProspect: async (
    data: ConvertLeadToProspectInput,
    user: SafeUser,
    organizationId: string,
  ): Promise<ConvertLeadToProspectResult> => {
    const lead = await leadRepository.findLeadById(data.leadId, organizationId);

    if (!lead) {
      throw AppError.resource.notFound("Lead not found");
    }

    if (user.role === Role.EXECUTIVE && lead.assignedToId !== user.id) {
      throw AppError.authorization.forbidden("Not authorized to convert");
    }

    if (lead.status !== LeadStatus.QUALIFIED) {
      throw AppError.validation.badRequest(
        "Only qualified leads can be converted to prospects",
      );
    }

    if (data.assignedToId) {
      await validateProspectAssignee(data.assignedToId, organizationId, user);
    }

    if (data.followUp?.assignedToId) {
      await validateProspectAssignee(
        data.followUp.assignedToId,
        organizationId,
        user,
      );
    }

    assertFollowUpDateIsTodayOrFuture(data.followUp?.date ?? null);

    const runConversion = async () => prisma.$transaction(async (tx: DB) => {
      const existingProspect = await prospectRepository.findByLeadId(
        data.leadId,
        organizationId,
        tx,
      );
      if (existingProspect) {
        return {
          isNew: false,
          prospect: existingProspect,
        };
      }

      await prospectRepository.unlinkDeletedProspect(
        data.leadId,
        organizationId,
        tx,
      );

      // Plan limit: a conversion that would create a NEW prospect is refused
      // after the idempotency return, so re-converting never trips it.
      await assertWithinLimit(
        organizationId,
        "MAX_PROSPECTS",
        billingRepository.countProspects,
        tx,
      );

      const assignedToId = data.assignedToId || lead.assignedToId || null;
      const followUpAssignedToId =
        data.followUp?.assignedToId || assignedToId || null;

      const prospect = await prospectRepository.createWithGeneratedNumber(
        organizationId,
        {
          lead: { connect: { id: data.leadId } },
          organization: { connect: { id: organizationId } },
          stage: (data.stage ?? "REQUIREMENT") as ProspectStage,
          expectedValue: data.expectedValue ?? null,
          closeDate: parseOptionalDate(data.closeDate) ?? null,
          notes: data.notes ?? null,
          assignedTo: assignedToId
            ? { connect: { id: assignedToId } }
            : undefined,
          followUpDate: parseOptionalDate(data.followUp?.date) ?? null,
          followUpTime: data.followUp?.time ?? null,
          followUpType:
            (data.followUp?.type as ProspectFollowUpType | undefined) ?? null,
          followUpNotes: data.followUp?.notes ?? null,
          followUpReminder:
            (data.followUp?.reminder as ProspectReminder | undefined) ?? null,
          followUpAssignedTo: followUpAssignedToId
            ? { connect: { id: followUpAssignedToId } }
            : undefined,
        },
        tx,
      );

      await (tx as Prisma.TransactionClient).lead.update({
        where: { id: data.leadId },
        data: {
          convertedAt: new Date(),
          convertedById: user.id,
        },
      });

      await prospectRepository.createActivity(
        {
          prospectId: prospect.id,
          type: ProspectActivityType.CONVERSION,
          title: "Lead converted",
          summary: `Converted from lead ${lead.leadNo}`,
          details: `Prospect ${prospect.prospectNo} created from lead ${lead.leadNo}.`,
          metadata: {
            sourceLeadId: lead.id,
            sourceLeadNo: lead.leadNo,
          },
          createdById: user.id,
        },
        tx,
      );

      if (data.followUp?.date) {
        await prospectRepository.createActivity(
          {
            prospectId: prospect.id,
            type: ProspectActivityType.FOLLOW_UP_SET,
            title: "Follow-up scheduled",
            summary: `Follow-up set for ${data.followUp.date}${data.followUp.time ? ` at ${data.followUp.time}` : ""}`,
            details: data.followUp.notes ?? null,
            metadata: {
              followUpDate: data.followUp.date,
              followUpTime: data.followUp.time ?? null,
              followUpType: data.followUp.type ?? null,
            },
            createdById: user.id,
          },
          tx,
        );
      }

      const created = await prospectRepository.findById(
        prospect.id,
        organizationId,
        tx,
      );

      if (!created) {
        throw AppError.system.internal("Failed to create prospect");
      }

      return {
        isNew: true,
        prospect: created,
      };
    });

    let result: Awaited<ReturnType<typeof runConversion>>;

    try {
      result = await runConversion();
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      logger.warn("Lead to prospect conversion hit unique constraint", {
        leadId: data.leadId,
        leadNo: lead.leadNo,
        organizationId,
        userId: user.id,
        prismaCode: "P2002",
        target: getUniqueErrorTarget(error),
      });

      const existingProspect = await prospectRepository.findByLeadId(
        data.leadId,
        organizationId,
      );

      if (uniqueErrorTargetsField(error, "leadId") && existingProspect) {
        result = {
          isNew: false,
          prospect: existingProspect,
        };
      } else if (uniqueErrorTargetsField(error, "prospectNo")) {
        try {
          result = await runConversion();
        } catch (retryError) {
          if (!isUniqueConstraintError(retryError)) {
            throw retryError;
          }
          logger.warn("Lead to prospect conversion prospect number retry failed", {
            leadId: data.leadId,
            leadNo: lead.leadNo,
            organizationId,
            userId: user.id,
            prismaCode: "P2002",
            target: getUniqueErrorTarget(retryError),
          });
          throw controlledUniqueError(retryError);
        }
      } else {
        throw controlledUniqueError(error);
      }
    }

    return {
      isNew: result.isNew,
      prospect: prospectService.mapProspectToResponse(result.prospect),
    };
  },

  updateProspect: async (
    id: string,
    data: UpdateProspectInput,
    user: SafeUser,
    organizationId: string,
  ): Promise<Prospect> => {
    const prospect = await prospectRepository.findById(id, organizationId);
    if (!prospect) {
      throw AppError.resource.notFound("Prospect");
    }

    assertProspectAccess(user, prospect);
    assertEditableProspect(prospect);

    if (data.assignedToId) {
      await validateProspectAssignee(data.assignedToId, organizationId, user);
    }

    const updated = await prisma.$transaction(async (tx: DB) => {
      if (!prospect.leadId) {
        throw AppError.business.stateConflict(
          "Cannot update a prospect that is no longer linked to a lead",
        );
      }

      await (tx as Prisma.TransactionClient).lead.update({
        where: { id: prospect.leadId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          mobile: data.mobile,
          companyName: data.companyName,
        },
      });

      return prospectRepository.update(
        id,
        organizationId,
        {
          expectedValue: data.expectedValue ?? null,
          notes: data.notes ?? null,
          assignedTo:
            data.assignedToId === undefined
              ? undefined
              : data.assignedToId
                ? { connect: { id: data.assignedToId } }
                : { disconnect: true },
        },
        tx,
      );
    });

    return prospectService.mapProspectToResponse(updated);
  },

  updateStage: async (
    id: string,
    data: UpdateProspectStageInput,
    user: SafeUser,
    organizationId: string,
  ): Promise<Prospect> => {
    const prospect = await prospectRepository.findById(id, organizationId);
    if (!prospect) {
      throw AppError.resource.notFound("Prospect");
    }

    assertProspectAccess(user, prospect);
    assertEditableProspect(prospect);

    if (prospect.stage === data.stage) {
      return prospectService.mapProspectToResponse(prospect);
    }

    const previousStage = prospect.stage;

    const updated = await prisma.$transaction(async (tx: DB) => {
      const nextProspect = await prospectRepository.update(
        id,
        organizationId,
        {
          stage: data.stage as ProspectStage,
        },
        tx,
      );

      await prospectRepository.createActivity(
        {
          prospectId: id,
          type: ProspectActivityType.STAGE_CHANGE,
          title: "Stage changed",
          summary: `Stage changed from ${previousStage} to ${data.stage}`,
          details: data.comment,
          metadata: {
            previousStage,
            newStage: data.stage,
            comment: data.comment,
          },
          createdById: user.id,
        },
        tx,
      );

      return prospectRepository.findById(nextProspect.id, organizationId, tx);
    });

    if (!updated) {
      throw AppError.system.internal("Failed to update prospect stage");
    }

    return prospectService.mapProspectToResponse(updated);
  },

  updateFollowUp: async (
    id: string,
    data: UpdateProspectFollowUpInput,
    user: SafeUser,
    organizationId: string,
  ): Promise<Prospect> => {
    const prospect = await prospectRepository.findById(id, organizationId);
    if (!prospect) {
      throw AppError.resource.notFound("Prospect");
    }

    assertProspectAccess(user, prospect);
    assertEditableProspect(prospect);
    assertFollowUpDateIsTodayOrFuture(data.date ?? null);

    if (data.assignedToId) {
      await validateProspectAssignee(data.assignedToId, organizationId, user);
    }

    const updated = await prospectRepository.update(id, organizationId, {
      followUpDate: parseOptionalDate(data.date) ?? null,
      followUpTime: data.time ?? null,
      followUpType: (data.type as ProspectFollowUpType | undefined) ?? null,
      followUpNotes: data.notes ?? null,
      followUpReminder: (data.reminder as ProspectReminder | undefined) ?? null,
      followUpAssignedTo:
        data.assignedToId === undefined
          ? undefined
          : data.assignedToId
            ? { connect: { id: data.assignedToId } }
            : { disconnect: true },
    });

    await prospectRepository.createActivity({
      prospectId: id,
      type: "FOLLOW_UP_SET",
      title: "Follow-up scheduled",
      summary: `Follow-up set for ${data.date}${data.time ? ` at ${data.time}` : ""}`,
      details: data.notes ?? null,
      metadata: {
        followUpDate: data.date,
        followUpTime: data.time ?? null,
        followUpType: data.type ?? null,
      },
      createdById: user.id,
    });

    return prospectService.mapProspectToResponse(updated);
  },

  createActivity: async (
    id: string,
    data: CreateProspectActivityInput,
    user: SafeUser,
    organizationId: string,
  ): Promise<ProspectActivity> => {
    const prospect = await prospectRepository.findById(id, organizationId);

    if (!prospect) {
      throw AppError.resource.notFound("Prospect");
    }

    assertProspectAccess(user, prospect);
    assertEditableProspect(prospect);

    const content = buildManualActivityContent(data);

    const created = await prospectRepository.createActivity({
      prospectId: id,
      type: data.type as ProspectActivityType,
      title: content.title,
      summary: content.summary,
      details: content.details,
      metadata: content.metadata,
      createdById: user.id,
      createdAt: new Date(data.occurredAt),
    });

    if (
      data.type === "CALL" ||
      data.type === "EMAIL" ||
      data.type === "MEETING"
    ) {
      const lastFollowUpActivity = prospect.activities?.find(
        (a) => a.type === "FOLLOW_UP_SET",
      );

      if (lastFollowUpActivity) {
        await prospectRepository.updateActivity(lastFollowUpActivity.id, {
          metadata: {
            ...(lastFollowUpActivity.metadata as Record<string, unknown>),
            completedHealth: "DONE",
          } as Prisma.InputJsonValue,
        });
      }

      await prospectRepository.update(id, organizationId, {
        followUpDate: null,
        followUpTime: null,
        followUpType: null,
        followUpNotes: null,
        followUpReminder: null,
      });
    }

    return mapActivity(created);
  },

  getProspectById: async (
    id: string,
    user: SafeUser,
    organizationId: string,
  ): Promise<Prospect> => {
    const prospect = await prospectRepository.findById(id, organizationId);
    if (!prospect) {
      throw AppError.resource.notFound("Prospect");
    }

    assertProspectAccess(user, prospect);
    return prospectService.mapProspectToResponse(prospect);
  },

  logQuotationActivity: async (
    prospectId: string,
    type: "QUOTATION_CREATED" | "QUOTATION_UPDATED",
    quotation: { id: string; quotationNo: string; refNo: string },
    userId: string,
    tx?: DB,
  ) => {
    const summary =
      type === "QUOTATION_CREATED"
        ? `Quotation #${quotation.quotationNo} was created.`
        : `Quotation #${quotation.quotationNo} was updated.`;

    const details = `Quotation Reference: ${quotation.refNo}`;

    return prospectRepository.createActivity(
      {
        prospectId,
        type,
        title:
          type === "QUOTATION_CREATED"
            ? "Quotation Created"
            : "Quotation Updated",
        summary,
        details,
        metadata: {
          quotationId: quotation.id,
          quotationNo: quotation.quotationNo,
          refNo: quotation.refNo,
        },
        createdById: userId,
      },
      tx,
    );
  },

  deleteProspect: async (
    id: string,
    user: SafeUser,
    organizationId: string,
  ): Promise<void> => {
    const prospect = await prospectRepository.findById(id, organizationId);
    if (!prospect) {
      throw AppError.resource.notFound("Prospect");
    }

    assertProspectAccess(user, prospect);
    
    if (isTerminalStage(prospect.stage)) {
      throw AppError.business.stateConflict(
        "Won or lost prospects cannot be deleted",
      );
    }

    await prospectRepository.softDelete(id, organizationId, user.id);
  },

  getCustomerStats: async (
    user: SafeUser,
    organizationId: string,
  ): Promise<{ total: number; active: number; inactive: number }> => {
    const assignedToFilter: Prisma.ProspectWhereInput =
      user.role === Role.EXECUTIVE
        ? { assignedToId: user.id }
        : user.role === Role.MANAGER
          ? {
              assignedTo: {
                is: {
                  OR: [{ id: user.id }, { managerId: user.id }],
                },
              },
            }
          : {};

    const [total, active] = await Promise.all([
      prisma.prospect.count({
        where: {
          organizationId,
          stage: "WON",
          deletedAt: null,
          ...assignedToFilter,
        },
      }),
      prisma.prospect.count({
        where: {
          organizationId,
          stage: "WON",
          deletedAt: null,
          lead: { deletedAt: null },
          ...assignedToFilter,
        },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
    };
  },
};

