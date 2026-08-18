import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import { auditService } from "../api/services";
import type { AuditLogListParams } from "../types";

/**
 * Audit log list.
 *
 * Super-admin reads across tenants; admin is pinned to its own organization by
 * the backend. The selected org id is part of the key so a super-admin browsing
 * an organization workspace does not reuse the unscoped cache entry.
 */
export const useAuditLogs = (params?: AuditLogListParams) => {
  const user = useAppSelector((s) => s.auth.user);
  const selectedOrgId = useAppSelector(
    (s) => s.auth.selectedOrganizationId,
  );

  const canReadAudit =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  return useQuery({
    queryKey: queryKeys.audit.list(params, selectedOrgId),
    queryFn: () => auditService.getAuditLogs(params),
    placeholderData: keepPreviousData,
    enabled: canReadAudit,
  });
};

/**
 * Download the current filters as CSV.
 *
 * A mutation rather than a query: it is an action the user takes, it must not
 * be cached, and it must not re-run when the filters change underneath it.
 */
export const useExportAuditLogs = () =>
  useMutation({
    mutationFn: (params?: AuditLogListParams) =>
      auditService.exportAuditLogs(params),
    onSuccess: (blob) => {
      // The filename the server sent is in Content-Disposition, which the
      // browser ignores for a blob we saved ourselves — so name it here.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Without this the blob is held for the lifetime of the document.
      URL.revokeObjectURL(url);

      toast.success("Audit log exported.");
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
