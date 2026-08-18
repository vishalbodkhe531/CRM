import { Role, AnnouncementStatus } from "@prisma/client";
import {
  announcementRepository,
  type AnnouncementViewer,
  type AnnouncementWithReceipt,
  type AnnouncementWithRelations,
} from "./announcement.repository";
import { AppError } from "../../utils/errors/appError";
import { ROLES } from "../../constants/roles";
import { ANNOUNCEMENT_MARK_ALL_READ_LIMIT } from "../../contracts/constants";
import type {
  AnnouncementFeedItem,
  AnnouncementListItem,
  AnnouncementReceiptResult,
} from "../../contracts/types";
import type {
  AnnouncementFeedInput,
  AnnouncementFilterInput,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../../contracts/validation";

type Actor = {
  id: string;
  role: Role;
  organizationId?: string | null;
};

/**
 * Fields whose change re-targets a live announcement.
 *
 * Editing these after publish retroactively changes who "already saw" it — a
 * user who read it yesterday may no longer be in the audience today, and the
 * receipt they left behind now describes an announcement they were never sent.
 */
const AUDIENCE_FIELDS = [
  "scope",
  "targetOrganizationIds",
  "targetRoles",
] as const;

/**
 * True when a row is inside its publish window right now.
 *
 * SCHEDULED counts: a future-dated publish is stored SCHEDULED and becomes live
 * automatically once publishAt passes — the publishAt window, not the status
 * label, is the timing authority, so both PUBLISHED and SCHEDULED are gated the
 * same way here.
 */
const resolveIsLive = (
  row: { status: AnnouncementStatus; publishAt: Date | null; expiresAt: Date | null },
  now: Date,
): boolean => {
  if (
    row.status !== AnnouncementStatus.PUBLISHED &&
    row.status !== AnnouncementStatus.SCHEDULED
  ) {
    return false;
  }
  if (row.publishAt && row.publishAt > now) return false;
  if (row.expiresAt && row.expiresAt <= now) return false;
  return true;
};

const mapToListItem = (
  row: AnnouncementWithRelations,
  now: Date,
  /**
   * Names for row.targetOrganizationIds. Supplied by the management list, which
   * resolves one page of ids in a single query; omitted elsewhere, where the
   * ids alone are enough and the extra lookup would not earn its keep.
   */
  organizationNames?: Map<string, string>,
): AnnouncementListItem => ({
  id: row.id,
  title: row.title,
  body: row.body,
  severity: row.severity,
  placement: row.placement,
  scope: row.scope,
  status: row.status,
  publishAt: row.publishAt?.toISOString() ?? null,
  expiresAt: row.expiresAt?.toISOString() ?? null,
  dismissible: row.dismissible,
  organizationId: row.organizationId,
  organizationName: row.organization?.name ?? null,
  targetOrganizationIds: row.targetOrganizationIds,
  targetOrganizationNames: organizationNames
    ? row.targetOrganizationIds.map(
        (id) => organizationNames.get(id) ?? "Unknown organization",
      )
    : null,
  targetRoles: row.targetRoles,
  createdBy: row.createdBy
    ? {
        id: row.createdBy.id,
        name: `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim(),
      }
    : null,
  isLive: resolveIsLive(row, now),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const mapToFeedItem = (
  row: AnnouncementWithReceipt,
  now: Date,
): AnnouncementFeedItem => {
  const receipt = row.receipts[0];

  return {
    ...mapToListItem(row, now),
    read: Boolean(receipt?.readAt),
    dismissed: Boolean(receipt?.dismissedAt),
  };
};

const toViewer = (actor: Actor): AnnouncementViewer => ({
  id: actor.id,
  role: actor.role,
  organizationId: actor.organizationId ?? null,
});

/**
 * Resolve the scope an actor is allowed to author in.
 *
 * A non-super-admin asking for PLATFORM is rejected, never silently downgraded:
 * a downgrade means the author believes they broadcast platform-wide and did not.
 */
const resolveAuthoringScope = (
  actor: Actor,
  requestedScope: "PLATFORM" | "ORGANIZATION" | undefined,
) => {
  const isSuperAdmin = actor.role === ROLES.SUPER_ADMIN;

  if (isSuperAdmin) {
    return {
      scope: requestedScope ?? "PLATFORM",
      // A super-admin authors on behalf of the platform, not of an organization.
      // ORGANIZATION scope from a super-admin has no owning org and would be
      // invisible to everyone, so it is rejected in validateAuthoringPayload.
      organizationId: null,
    } as const;
  }

  if (requestedScope === "PLATFORM") {
    throw AppError.authorization.forbidden(
      "Only a super admin can create platform-wide announcements",
    );
  }

  if (!actor.organizationId) {
    throw AppError.authorization.forbidden(
      "User must belong to an organization",
    );
  }

  return {
    scope: "ORGANIZATION",
    organizationId: actor.organizationId,
  } as const;
};

const validateAuthoringPayload = async (
  actor: Actor,
  scope: "PLATFORM" | "ORGANIZATION",
  targetOrganizationIds: string[],
) => {
  if (actor.role === ROLES.SUPER_ADMIN && scope === "ORGANIZATION") {
    throw AppError.validation.badRequest(
      "A super admin cannot author an organization-scoped announcement; it would have no owning organization",
    );
  }

  if (!targetOrganizationIds.length) return;

  if (scope !== "PLATFORM") {
    throw AppError.validation.badRequest(
      "targetOrganizationIds is only valid for platform announcements",
    );
  }

  // An unknown id silently narrows the audience to nobody, which reads as
  // "the broadcast didn't work" rather than "the id was wrong".
  const unique = [...new Set(targetOrganizationIds)];
  const found = await announcementRepository.countExistingOrganizations(unique);

  if (found !== unique.length) {
    throw AppError.validation.badRequest(
      "One or more target organizations do not exist",
    );
  }
};

/**
 * Load an announcement the actor is allowed to manage.
 *
 * Rejects rather than returning 404 for a cross-tenant row, matching
 * auditService.getAuditLogs — an empty result would read as "no such thing"
 * instead of "not yours".
 */
const loadManageable = async (id: string, actor: Actor) => {
  const announcement = await announcementRepository.findById(id);

  if (!announcement) {
    throw AppError.resource.notFound("Announcement", id);
  }

  if (actor.role === ROLES.SUPER_ADMIN) {
    return announcement;
  }

  if (
    announcement.scope !== "ORGANIZATION" ||
    announcement.organizationId !== actor.organizationId
  ) {
    throw AppError.authorization.forbidden(
      "Access denied: Announcement belongs to another organization",
    );
  }

  return announcement;
};

export const announcementService = {
  async createAnnouncement(
    input: CreateAnnouncementInput,
    actor: Actor,
  ): Promise<AnnouncementListItem> {
    const now = new Date();
    const { scope, organizationId } = resolveAuthoringScope(actor, input.scope);
    const targetOrganizationIds =
      scope === "PLATFORM" ? input.targetOrganizationIds : [];

    await validateAuthoringPayload(actor, scope, targetOrganizationIds);

    const created = await announcementRepository.create({
      title: input.title,
      body: input.body,
      severity: input.severity,
      placement: input.placement,
      scope,
      // Everything starts as a draft. Publishing is an explicit, audited act so
      // a half-written broadcast cannot reach a tenant by accident.
      status: AnnouncementStatus.DRAFT,
      organizationId,
      targetOrganizationIds,
      targetRoles: input.targetRoles,
      publishAt: input.publishAt ?? null,
      expiresAt: input.expiresAt ?? null,
      dismissible: input.dismissible,
      createdById: actor.id,
    });

    return mapToListItem(created, now);
  },

  async updateAnnouncement(
    id: string,
    input: UpdateAnnouncementInput,
    actor: Actor,
  ): Promise<AnnouncementListItem> {
    const now = new Date();
    const existing = await loadManageable(id, actor);

    if (existing.status === AnnouncementStatus.ARCHIVED) {
      throw AppError.business.stateConflict(
        "An archived announcement cannot be edited",
      );
    }

    // A published OR scheduled announcement stays editable for typo fixes, but its
    // audience is frozen — see AUDIENCE_FIELDS. A SCHEDULED row is a future-dated
    // publish that goes live automatically once publishAt passes, so its audience
    // must be locked exactly like a live one; otherwise it can be silently
    // retargeted right up until it appears.
    if (
      existing.status === AnnouncementStatus.PUBLISHED ||
      existing.status === AnnouncementStatus.SCHEDULED
    ) {
      const retargets = AUDIENCE_FIELDS.some((field) => {
        const value = input[field];
        if (value === undefined) return false;

        if (Array.isArray(value)) {
          const current = existing[field] as string[];
          return (
            value.length !== current.length ||
            value.some((entry, index) => entry !== current[index])
          );
        }

        return value !== existing[field];
      });

      if (retargets) {
        throw AppError.business.stateConflict(
          "The audience of a published or scheduled announcement cannot be changed. Archive it and create a new one.",
        );
      }
    }

    if (input.targetOrganizationIds?.length) {
      await validateAuthoringPayload(
        actor,
        existing.scope,
        input.targetOrganizationIds,
      );
    }

    const updated = await announcementRepository.update(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.placement !== undefined ? { placement: input.placement } : {}),
      ...(input.targetRoles !== undefined ? { targetRoles: input.targetRoles } : {}),
      ...(input.targetOrganizationIds !== undefined
        ? { targetOrganizationIds: input.targetOrganizationIds }
        : {}),
      ...(input.publishAt !== undefined ? { publishAt: input.publishAt } : {}),
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
      ...(input.dismissible !== undefined ? { dismissible: input.dismissible } : {}),
    });

    return mapToListItem(updated, now);
  },

  /**
   * Publish.
   *
   * A future publishAt is stored as SCHEDULED; a live one as PUBLISHED. The
   * publishAt window in buildVisibilityWhere remains the single authority on when
   * a row actually appears — a SCHEDULED row becomes visible automatically once
   * its publishAt passes, with no status-flipping job. Storing the distinct
   * status makes the "Scheduled" filter and badge real rather than dead states.
   */
  async publishAnnouncement(
    id: string,
    actor: Actor,
  ): Promise<AnnouncementListItem> {
    const now = new Date();
    const existing = await loadManageable(id, actor);

    if (
      existing.status === AnnouncementStatus.PUBLISHED ||
      existing.status === AnnouncementStatus.SCHEDULED
    ) {
      throw AppError.business.stateConflict("Announcement is already published");
    }

    if (existing.status === AnnouncementStatus.ARCHIVED) {
      throw AppError.business.stateConflict(
        "An archived announcement cannot be published. Create a new one.",
      );
    }

    if (existing.expiresAt && existing.expiresAt <= now) {
      throw AppError.business.ruleViolation(
        "Cannot publish an announcement whose end time has already passed",
      );
    }

    const isFutureDated = Boolean(existing.publishAt && existing.publishAt > now);

    const updated = await announcementRepository.update(id, {
      status: isFutureDated
        ? AnnouncementStatus.SCHEDULED
        : AnnouncementStatus.PUBLISHED,
    });

    return mapToListItem(updated, now);
  },

  async archiveAnnouncement(
    id: string,
    actor: Actor,
  ): Promise<AnnouncementListItem> {
    const now = new Date();
    const existing = await loadManageable(id, actor);

    if (existing.status === AnnouncementStatus.ARCHIVED) {
      throw AppError.business.stateConflict("Announcement is already archived");
    }

    const updated = await announcementRepository.update(id, {
      status: AnnouncementStatus.ARCHIVED,
    });

    return mapToListItem(updated, now);
  },

  async deleteAnnouncement(id: string, actor: Actor): Promise<AnnouncementListItem> {
    const now = new Date();
    await loadManageable(id, actor);

    const deleted = await announcementRepository.softDelete(id, now);
    return mapToListItem(deleted, now);
  },

  async getAnnouncementById(
    id: string,
    actor: Actor,
  ): Promise<AnnouncementListItem> {
    const now = new Date();
    const announcement = await loadManageable(id, actor);
    return mapToListItem(announcement, now);
  },

  /**
   * Management list.
   *
   * Super-admin sees every announcement across tenants, optionally narrowed by
   * organizationId. An org admin sees only its own organization-scoped rows —
   * platform announcements are readable in their feed but are not theirs to manage.
   */
  async getAnnouncements(
    params: AnnouncementFilterInput,
    actor: Actor,
  ): Promise<{ data: AnnouncementListItem[]; meta: any }> {
    const now = new Date();
    const isSuperAdmin = actor.role === ROLES.SUPER_ADMIN;

    let organizationId: string | undefined;
    let restrictToOrganizationId: string | undefined;

    if (isSuperAdmin) {
      organizationId = params.organizationId;
    } else {
      if (!actor.organizationId) {
        throw AppError.authorization.forbidden(
          "User must belong to an organization",
        );
      }

      if (params.organizationId && params.organizationId !== actor.organizationId) {
        throw AppError.authorization.forbidden(
          "Access denied: Announcements belong to another organization",
        );
      }

      restrictToOrganizationId = actor.organizationId;
    }

    const result = await announcementRepository.findAll({
      pageNum: params.page,
      limitNum: params.limit,
      search: params.search,
      status: params.status,
      scope: params.scope,
      severity: params.severity,
      organizationId,
      restrictToOrganizationId,
    });

    // One lookup for every target id on this page, so the table can render
    // names without fetching the organization list client-side.
    const targetIds = [
      ...new Set(result.data.flatMap((row) => row.targetOrganizationIds)),
    ];
    const organizationNames =
      await announcementRepository.findOrganizationNames(targetIds);

    return {
      data: result.data.map((row) =>
        mapToListItem(row, now, organizationNames),
      ),
      meta: result.meta,
    };
  },

  /**
   * Viewer feed plus the unread count.
   *
   * One `now` is shared by the list and the count so a row cannot straddle the
   * publish/expiry boundary between the two queries and leave the badge
   * disagreeing with the list it labels.
   */
  async getFeed(
    params: AnnouncementFeedInput,
    actor: Actor,
  ): Promise<{ data: AnnouncementFeedItem[]; meta: { unreadCount: number } }> {
    const now = new Date();
    const viewer = toViewer(actor);

    const [rows, unreadCount] = await Promise.all([
      announcementRepository.findFeed(viewer, now, {
        limit: params.limit,
        includeDismissed: params.includeDismissed,
      }),
      announcementRepository.countUnread(viewer, now),
    ]);

    return {
      data: rows.map((row) => mapToFeedItem(row, now)),
      meta: { unreadCount },
    };
  },

  /**
   * Mark one announcement read or dismissed.
   *
   * Visibility is re-checked before the receipt is written: without it, any
   * authenticated user could create receipts against another tenant's
   * announcements by guessing uuids.
   */
  async recordReceipt(
    id: string,
    actor: Actor,
    action: "read" | "dismiss",
  ): Promise<AnnouncementReceiptResult> {
    const now = new Date();
    const viewer = toViewer(actor);

    const visible = await announcementRepository.isVisibleToViewer(id, viewer, now);
    if (!visible) {
      throw AppError.authorization.forbidden(
        "Access denied: Announcement is not available to you",
      );
    }

    // Dismissing implies reading — a user cannot dismiss something they never saw,
    // and leaving readAt null would keep it in the unread count forever.
    const data =
      action === "dismiss" ? { readAt: now, dismissedAt: now } : { readAt: now };

    const receipt = await announcementRepository.upsertReceipt(id, viewer.id, data);
    const unreadCount = await announcementRepository.countUnread(viewer, now);

    return {
      announcementId: id,
      read: Boolean(receipt.readAt),
      dismissed: Boolean(receipt.dismissedAt),
      unreadCount,
    };
  },

  async markAllRead(actor: Actor): Promise<{ unreadCount: number }> {
    const now = new Date();
    const viewer = toViewer(actor);

    // Loop in batches so a viewer with more unread than one batch still reaches
    // zero, instead of stopping after the first ANNOUNCEMENT_MARK_ALL_READ_LIMIT.
    // The onlyUnread filter guarantees each batch is fresh work, so the guard is
    // a safety bound, not the normal exit.
    const MAX_BATCHES = 100;
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const ids = await announcementRepository.findVisibleIds(
        viewer,
        now,
        ANNOUNCEMENT_MARK_ALL_READ_LIMIT,
        { onlyUnread: true },
      );

      if (ids.length === 0) break;

      await announcementRepository.markManyRead(ids, viewer.id, now);

      if (ids.length < ANNOUNCEMENT_MARK_ALL_READ_LIMIT) break;
    }

    const unreadCount = await announcementRepository.countUnread(viewer, now);
    return { unreadCount };
  },
};
