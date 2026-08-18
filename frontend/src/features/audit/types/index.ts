import type { AuditAction, AuditEntityType } from "@/contracts/types";

export type {
  AuditAction,
  AuditActor,
  AuditEntityType,
  AuditLogEntry,
  AuditSnapshot,
} from "@/contracts/types";

export type AuditLogListParams = {
  page?: number;
  limit?: number;
  search?: string;
  action?: AuditAction | AuditAction[];
  entityType?: AuditEntityType | AuditEntityType[];
  entityId?: string;
  actorId?: string;
  /** Super-admin only; the backend forces every other role to its own org. */
  organizationId?: string;
  createdFrom?: string;
  createdTo?: string;
};
