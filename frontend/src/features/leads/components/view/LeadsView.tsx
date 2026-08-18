import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/hooks/useAuth";
import { ROLES } from "@/constants/roles";
import { useMemo, useState } from "react";
import { useListView } from "@/hooks/useListView";
import { useAssignableUsers, useLeads } from "../../hooks/useLeads";
import { useItems } from "../../../items/hooks/useItems";
import {
  useAssignLead,
  useUpdateLeadStatus,
} from "../../hooks/useLeadMutations";
import LeadsTable from "../table/LeadsTable";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import { LEAD_FILTER_CONFIG } from "../../constants/filters";
import { isLeadStatusValue, leadStatusOptions } from "../../constants/options";
import type { Lead, LeadFilterValues } from "../../types";
import { useDeleteLead } from "../../hooks/useLeadMutations";
import { useConfirm } from "@/hooks/useConfirm";
import type { FilterConfigItem } from "@/types/filter.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LeadsStats from "../lead-stats/LeadsStats";
import { Upload } from "lucide-react";
import ImportLeadsDialog from "../dialogs/ImportLeadsDialog";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

const LeadsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const { user } = useAuth();
  const currentRole = user?.role;
  const { data: assignableUsers = [] } = useAssignableUsers();
  const { data: itemsData } = useItems({ limit: 100 });

  const { mutateAsync: assignLead, isPending: isAssigning } = useAssignLead();
  const { mutateAsync: updateLeadStatus, isPending: isUpdatingStatus } =
    useUpdateLeadStatus();
  const { mutateAsync: deleteLead, isPending: isDeleting } = useDeleteLead();

  const isAnyActionPending = isAssigning || isUpdatingStatus || isDeleting;

  const [assigneeLead, setAssigneeLead] = useState<Lead | null>(null);
  const [statusLead, setStatusLead] = useState<Lead | null>(null);
  const [assigneeDraft, setAssigneeDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<Lead["status"]>("NEW");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const filterConfig = useMemo<FilterConfigItem[]>(() => {
    const items = itemsData?.data || [];
    const productOptions = items.map((item) => ({
      value: item.id,
      label: item.name,
    }));

    const config = [...LEAD_FILTER_CONFIG];

    if (productOptions.length > 0) {
      config.push({
        type: "checkbox-group",
        name: "productInterested",
        label: "Product Interested",
        options: productOptions,
      });
    }

    return config;
  }, [itemsData?.data]);

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

  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig,
  });

  const { data, isLoading } = useLeads(queryParams as LeadFilterValues);
  const leads = data?.data || [];
  const meta = data?.meta;


  const handleRowClick = (lead: Lead) => {
    navigate(scopedPath(`/leads/${lead.id}`));
  };

  const handleEdit = (lead: Lead) => {
    navigate(scopedPath(`/leads/${lead.id}?mode=edit`));
  };

  const handleOpenAssigneeDialog = (lead: Lead) => {
    setAssigneeLead(lead);
    setAssigneeDraft(lead.assignedToId ?? "");
  };

  const handleOpenStatusDialog = (lead: Lead) => {
    setStatusLead(lead);
    setStatusDraft(lead.status);
  };

  const handleQuickAssigneeChange = async () => {
    if (!assigneeLead) return;
    if (!assigneeDraft || assigneeDraft === (assigneeLead.assignedToId ?? "")) {
      return;
    }

    try {
      await assignLead({ id: assigneeLead.id, executiveId: assigneeDraft });
      setAssigneeLead(null);
    } catch {
      // handled in mutation hook
    }
  };

  const handleQuickStatusChange = async () => {
    if (!statusLead) return;
    if (statusDraft === statusLead.status) return;

    try {
      const result = await updateLeadStatus({ id: statusLead.id, status: statusDraft });
      setStatusLead(null);

      if (result?.meta?.prospect?.id) {
        navigate(scopedPath(`/prospects/${result.meta.prospect.id}`));
      }
    } catch {
      // handled in mutation hook
    }
  };

  const {
    confirmProps,
    data: leadToDelete,
    open: openDeleteDialog,
    close: closeDeleteDialog,
  } = useConfirm<Lead>();

  const handleDelete = (lead: Lead) => {
    openDeleteDialog(lead);
  };

  const handleConfirmDelete = async () => {
    if (leadToDelete) {
      await deleteLead(leadToDelete.id);
      closeDeleteDialog();
    }
  };

  return (
    <ListViewLayout
      {...toolbarProps}
      title="Enquiries"
      description="Manage your sales leads and enquiries."
      filterConfig={filterConfig}
      stats={<LeadsStats />}
      searchPlaceholder="Search by Lead ID, Company Name..."
      addButtonLabel="+ Add Lead"
      onAddClick={() => navigate(scopedPath("/leads/new"))}
      extraActions={
        <Button
          type="button"
          onClick={() => setIsImportDialogOpen(true)}
          className="h-11 rounded-full px-6 font-bold shadow-md bg-primary hover:opacity-90 transition-all active:scale-95 text-primary-foreground flex gap-2 items-center"
        >
          <Upload className="h-4 w-4" />
          Import
        </Button>
      }
      table={
        <LeadsTable
          leads={leads}
          loading={isLoading}
          onView={handleRowClick}
          onEdit={handleEdit}
          onChangeAssignee={handleOpenAssigneeDialog}
          onChangeStatus={handleOpenStatusDialog}
          onDelete={handleDelete}
          currentRole={currentRole}
          actionLoading={isAnyActionPending}
          meta={meta}
        />
      }
      meta={meta}
      onPageChange={onPageChange}
      itemLabel="leads"
    >
      <ImportLeadsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      <Dialog
        open={!!assigneeLead}
        onOpenChange={(open) => {
          if (!open) setAssigneeLead(null);
        }}
      >
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Change Assignee</DialogTitle>
            <DialogDescription>
              {assigneeLead
                ? `Update assignee for ${[assigneeLead.firstName, assigneeLead.lastName].filter(Boolean).join(" ")}.`
                : "Update lead assignee."}
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
              onClick={() => setAssigneeLead(null)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleQuickAssigneeChange}
              disabled={
                isAssigning ||
                !assigneeDraft ||
                assigneeDraft === (assigneeLead?.assignedToId ?? "")
              }
            >
              {isAssigning ? "Changing..." : "Change Assignee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!statusLead}
        onOpenChange={(open) => {
          if (!open) setStatusLead(null);
        }}
      >
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              {statusLead
                ? `Update status for ${[statusLead.firstName, statusLead.lastName].filter(Boolean).join(" ")}.`
                : "Update lead status."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">

            <Select
              name="quick-status"
              value={statusDraft}
              onValueChange={(value) => {
                if (isLeadStatusValue(value)) {
                  setStatusDraft(value);
                }
              }}
              options={leadStatusOptions}
              disabled={
                statusLead?.isConverted &&
                currentRole !== ROLES.ADMIN &&
                currentRole !== ROLES.SUPER_ADMIN
              }
            />
          </div>
          {statusDraft === "QUALIFIED" && (
            <div className="mt-0 m-3 rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                ⚠️ Saving as <strong>Qualified</strong> will automatically convert this lead to a <strong>Prospect</strong> and redirect you there.
              </p>
            </div>
          )}
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusLead(null)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Button
                    type="button"
                    onClick={handleQuickStatusChange}
                    disabled={
                      isUpdatingStatus ||
                      statusDraft === (statusLead?.status ?? "NEW") ||
                      (statusLead?.isConverted &&
                        currentRole !== ROLES.ADMIN &&
                        currentRole !== ROLES.SUPER_ADMIN)
                    }
                  >
                    {isUpdatingStatus ? "Changing..." : "Change Status"}
                  </Button>
                </div>
              </TooltipTrigger>
              {statusLead?.isConverted &&
                currentRole !== ROLES.ADMIN &&
                currentRole !== ROLES.SUPER_ADMIN && (
                  <TooltipContent side="top">
                    Status cannot be changed after conversion
                  </TooltipContent>
                )}
            </Tooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        {...confirmProps}
        title="Delete Lead"
        description={`Are you sure you want to delete lead ${leadToDelete?.leadNo}? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </ListViewLayout>
  );
};

export default LeadsPage;
