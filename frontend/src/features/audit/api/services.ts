import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type { AuditLogEntry } from "@/contracts/types";
import type { AuditLogListParams } from "../types";
import { AUDIT_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

export const auditService = {
  getAuditLogs: (params?: AuditLogListParams) =>
    service.get<AuditLogEntry[]>(AUDIT_ENDPOINTS.LIST, { params }),

  /**
   * CSV of every row matching the filters, not just the current page.
   *
   * Goes through the shared axios instance rather than a plain link so it
   * carries the Authorization header — `<a download>` cannot, and the endpoint
   * is authenticated. `page` and `limit` are stripped: they describe the table's
   * viewport, and sending them would silently truncate the export to 20 rows.
   */
  exportAuditLogs: async (params?: AuditLogListParams): Promise<Blob> => {
    const { page: _page, limit: _limit, ...filters } = params ?? {};

    const response = await api.get<Blob>(AUDIT_ENDPOINTS.EXPORT, {
      params: filters,
      responseType: "blob",
    });

    return response.data;
  },
};
