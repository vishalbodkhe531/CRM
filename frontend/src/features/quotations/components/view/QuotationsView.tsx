import ConfirmDialog from "@/components/common/ConfirmDialog";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { UserRole } from "@/constants/roles";
import { useAssignableUsers } from "@/features/leads";
import { useAppSelector } from "@/hooks/useRedux";
import { useConfirm } from "@/hooks/useConfirm";
import { useListView } from "@/hooks/useListView";
import type { FilterConfigItem } from "@/types/filter.types";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QUOTATION_FILTER_CONFIG } from "../../constants/filters";
import {
  isQuotationStatusValue,
  quotationStatusOptions,
} from "../../constants/options";
import { useQuotations } from "../../hooks/useQuotations";
import type {
  Quotation,
  QuotationFilterValues
} from "../../types";
import QuotationsStats from "../quotations-stats/QuotationsStats";
import QuotationsTable from "../table/QuotationsTable";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

const QuotationsView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const currentRole = useAppSelector(
    (state) => state.auth.user?.role,
  ) as UserRole | undefined;
  const { data: assignableUsers = [] } = useAssignableUsers();

  // --- Status Dialog ---
  const [statusQuotation, setStatusQuotation] = useState<Quotation | null>(
    null,
  );
  const [statusDraft, setStatusDraft] =
    useState<Quotation["status"]>("PENDING");
  const [statusReason, setStatusReason] = useState("");

  // --- Assignee Dialog ---
  const [assigneeQuotation, setAssigneeQuotation] = useState<Quotation | null>(
    null,
  );
  const [assigneeDraft, setAssigneeDraft] = useState("");

  // --- Action loading simulation ---
  const [isActionPending, setIsActionPending] = useState(false);

  const filterConfig = useMemo<FilterConfigItem[]>(() => {
    return [...QUOTATION_FILTER_CONFIG];
  }, []);

  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig,
    minSearchLength: 3,
  });

  const {
    data: quotationsData,
    isLoading,
    stats,
    mutations,
  } = useQuotations(queryParams as QuotationFilterValues, assignableUsers);

  const quotations = quotationsData?.data || [];
  const meta = quotationsData?.meta;

  const quickAssigneeOptions = useMemo(
    () => [
      { value: "", label: "Select Assignee" },
      ...assignableUsers.map((user) => ({
        value: user.id,
        label: `${user.firstName} ${user.lastName}`,
      })),
    ],
    [assignableUsers],
  );

  // --- Handlers ---

  const handleView = (quotation: Quotation) => {
    navigate(scopedPath(`/quotations/${quotation.id}`));
  };

  const handleEdit = (quotation: Quotation) => {
    navigate(scopedPath(`/quotations/${quotation.id}?edit=true`));
  };

  const handleOpenStatusDialog = (quotation: Quotation) => {
    setStatusQuotation(quotation);
    setStatusDraft(quotation.status);
    setStatusReason("");
  };

  const handleQuickStatusChange = async () => {
    if (!statusQuotation) return;
    if (statusDraft === statusQuotation.status && !statusReason) return;

    setIsActionPending(true);
    try {
      await mutations.updateStatus(statusQuotation.id, statusDraft);
      setStatusQuotation(null);
      setStatusReason("");
    } catch {
      // handled in mutation hook
    } finally {
      setIsActionPending(false);
    }
  };

  const handleOpenAssigneeDialog = (quotation: Quotation) => {
    setAssigneeQuotation(quotation);
    setAssigneeDraft(quotation.assignedToId ?? "");
  };

  const handleQuickAssigneeChange = async () => {
    if (!assigneeQuotation) return;
    if (
      !assigneeDraft ||
      assigneeDraft === (assigneeQuotation.assignedToId ?? "")
    ) {
      return;
    }

    setIsActionPending(true);
    try {
      await mutations.assignQuotation(assigneeQuotation.id, assigneeDraft);
      setAssigneeQuotation(null);
    } catch {
      // handled in mutation hook
    } finally {
      setIsActionPending(false);
    }
  };

  // --- Delete ---
  const {
    confirmProps,
    data: quotationToDelete,
    open: openDeleteDialog,
    close: closeDeleteDialog,
  } = useConfirm<Quotation>();

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (quotation: Quotation) => {
    openDeleteDialog(quotation);
  };

  const handleConfirmDelete = async () => {
    if (quotationToDelete) {
      setIsDeleting(true);
      try {
        await mutations.deleteQuotation(quotationToDelete.id);
        closeDeleteDialog();
      } catch {
        // handled in mutation hook
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // --- Create ---

  return (
    <>
      <ListViewLayout
        {...toolbarProps}
        title="Quotation"
        description="Manage your quotations and approvals."
        filterConfig={filterConfig}
        stats={
          <QuotationsStats
            total={stats.total}
            pending={stats.pending}
            approved={stats.approved}
            rejected={stats.rejected}
          />
        }
        searchPlaceholder="Search by Quotation ID / Party Name"
        addButtonLabel="+ Create Quotation"
        onAddClick={() => navigate(scopedPath("/quotations/new"))}
        table={
          <QuotationsTable
            quotations={quotations}
            loading={isLoading}
            onView={handleView}
            onEdit={handleEdit}
            onChangeAssignee={handleOpenAssigneeDialog}
            onChangeStatus={handleOpenStatusDialog}
            onDelete={handleDelete}
            actionLoading={isActionPending}
            currentRole={currentRole}
            meta={meta}
          />
        }
        meta={meta}
        onPageChange={onPageChange}
        itemLabel="quotations"
      />

      {/* ---- Change Assignee Dialog ---- */}
      <Dialog
        open={!!assigneeQuotation}
        onOpenChange={(open) => {
          if (!open) setAssigneeQuotation(null);
        }}
      >
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Change Assignee</DialogTitle>
            <DialogDescription>
              {assigneeQuotation
                ? `Update assignee for ${assigneeQuotation.quotationNo}.`
                : "Update quotation assignee."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <Select
              name="quick-assign"
              value={assigneeDraft}
              onValueChange={setAssigneeDraft}
              options={quickAssigneeOptions}
            />
          </div>
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssigneeQuotation(null)}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleQuickAssigneeChange}
              disabled={
                isActionPending ||
                !assigneeDraft ||
                assigneeDraft === (assigneeQuotation?.assignedToId ?? "")
              }
            >
              {isActionPending ? "Changing..." : "Change Assignee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Change Status Dialog ---- */}
      <Dialog
        open={!!statusQuotation}
        onOpenChange={(open) => {
          if (!open) setStatusQuotation(null);
        }}
      >
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              {statusQuotation
                ? `Update status for ${statusQuotation.quotationNo}.`
                : "Update quotation status."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <Select
              name="quick-status"
              value={statusDraft}
              onValueChange={(value) => {
                if (isQuotationStatusValue(value)) {
                  setStatusDraft(value);
                  if (value !== "REJECTED") {
                    setStatusReason("");
                  }
                }
              }}
              options={quotationStatusOptions}
            />
            {statusDraft === "REJECTED" && (
              <div className="space-y-2">
                <Label htmlFor="statusReason">Rejection Reason <span className="text-destructive">*</span></Label>
                <Input
                  id="statusReason"
                  placeholder="Enter reason for rejection"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  disabled={isActionPending}
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusQuotation(null)}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleQuickStatusChange}
              disabled={
                isActionPending ||
                (statusDraft === (statusQuotation?.status ?? "PENDING") && !statusReason) ||
                (statusDraft === "REJECTED" && statusReason.trim().length < 2)
              }
            >
              {isActionPending ? "Changing..." : "Change Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirm Dialog ---- */}
      <ConfirmDialog
        {...confirmProps}
        title="Delete Quotation"
        description={`Are you sure you want to delete quotation ${quotationToDelete?.quotationNo}? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </>
  );
};

export default QuotationsView;
