import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useListView } from "@/hooks/useListView";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import type { FilterConfigItem } from "@/types/filter.types";
import { useAssignableUsers } from "@/features/leads";
import { PROSPECT_FILTER_CONFIG } from "../../constants/filters";
import { useProspects } from "../../hooks/useProspects";
import ProspectsTable from "../table/ProspectsTable";
import type { Prospect } from "../../types";
import ProspectsStats from "../prospects-stats/ProspectsStats";
import { useUpdateProspectStage, useDeleteProspect } from "../../hooks/useProspectMutations";
import { prospectStageOptions, isProspectStageValue } from "../../constants/options";
import ConfirmDialog from "@/components/common/ConfirmDialog";
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
import FormField from "@/components/common/FormField";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

const textareaClassName =
  "w-full resize-none rounded-xl border border-input bg-card px-3 py-2.5 text-sm shadow-sm outline-none transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

const ProspectsView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const { data: assignees = [] } = useAssignableUsers();

  const { mutateAsync: updateStage, isPending: isUpdatingStage } =
    useUpdateProspectStage();
  const { mutateAsync: deleteProspect, isPending: isDeleting } =
    useDeleteProspect();

  const [stageProspect, setStageProspect] = useState<Prospect | null>(null);
  const [stageDraft, setStageDraft] = useState<Prospect["stage"]>("REQUIREMENT");
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");

  const [deleteProspectItem, setDeleteProspectItem] = useState<Prospect | null>(null);

  const filterConfig = useMemo<FilterConfigItem[]>(() => {
    return [
      ...PROSPECT_FILTER_CONFIG,
      {
        type: "select",
        name: "assignedToId",
        label: "Assigned To",
        placeholder: "All assignees",
        options: [
          { value: "", label: "All assignees" },
          ...assignees.map((assignee) => ({
            value: assignee.id,
            label: `${assignee.firstName} ${assignee.lastName}`,
          })),
        ],
      },
    ];
  }, [assignees]);

  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig,
    minSearchLength: 3,
  });

  const { data: prospectsData, isLoading } = useProspects(queryParams);


  const handleView = (prospect: Prospect) => {
    navigate(scopedPath(`/prospects/${prospect.id}`));
  };

  const handleOpenStageDialog = (prospect: Prospect) => {
    setStageProspect(prospect);
    setStageDraft(prospect.stage);
    setComment("");
    setCommentError("");
  };

  const handleQuickStageChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageProspect) return;
    if (stageDraft === stageProspect.stage) {
      setStageProspect(null);
      return;
    }
    if (comment.trim().length < 10) {
      setCommentError("Comment must be at least 10 characters");
      return;
    }

    try {
      await updateStage({
        id: stageProspect.id,
        data: { stage: stageDraft, comment: comment.trim() },
      });
      setStageProspect(null);
    } catch {
      // handled in mutation hook
    }
  };

  const handleDelete = async () => {
    if (!deleteProspectItem) return;
    try {
      await deleteProspect(deleteProspectItem.id);
      setDeleteProspectItem(null);
    } catch {
      // handled in mutation hook
    }
  };

  const hasPendingStageChange =
    stageProspect && stageDraft !== stageProspect.stage;

  return (
    <>
      <ListViewLayout
        {...toolbarProps}
        title="Prospects"
        stats={
          <ProspectsStats
            prospects={prospectsData?.data || []}
            meta={prospectsData?.meta}
            isLoading={isLoading}
          />
        }
        description="Track conversions, follow-up health, and stage progress across your active pipeline."
        filterConfig={filterConfig}
        searchPlaceholder="Search by Prospect No, Lead No, Name, Company, or Email"
        showAddButton={false}
        table={
          <ProspectsTable
            prospects={prospectsData?.data || []}
            loading={isLoading}
            onView={handleView}
            onEdit={handleView}
            onChangeStage={handleOpenStageDialog}
            onDelete={setDeleteProspectItem}
            meta={prospectsData?.meta}
          />
        }
        meta={prospectsData?.meta}
        onPageChange={onPageChange}
        itemLabel="prospects"
      />

      <Dialog
        open={!!stageProspect}
        onOpenChange={(open) => {
          if (!open) setStageProspect(null);
        }}
      >
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Change Stage</DialogTitle>
            <DialogDescription>
              {stageProspect
                ? `Update stage for ${[stageProspect.lead?.firstName, stageProspect.lead?.lastName].filter(Boolean).join(" ") || stageProspect.prospectNo}.`
                : "Update prospect stage."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickStageChange}>
            <div className="space-y-4 px-6 py-5">
              <FormField label="New Stage" required>
                <Select
                  name="quick-stage"
                  value={stageDraft}
                  onValueChange={(value) => {
                    if (isProspectStageValue(value)) {
                      setStageDraft(value);
                    }
                  }}
                  options={prospectStageOptions}
                />
              </FormField>
              {hasPendingStageChange ? (
                <FormField label="Comment" required error={commentError}>
                  <textarea
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      if (e.target.value.trim().length >= 10) {
                        setCommentError("");
                      }
                    }}
                    rows={4}
                    className={textareaClassName}
                    placeholder="Explain why the stage is changing"
                  />
                </FormField>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a different stage to unlock the comment field.
                </p>
              )}
            </div>
            <DialogFooter className="border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStageProspect(null)}
                disabled={isUpdatingStage}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingStage || !hasPendingStageChange}
              >
                {isUpdatingStage ? "Updating..." : "Change Stage"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={!!deleteProspectItem}
        onOpenChange={(open) => !open && setDeleteProspectItem(null)}
        onConfirm={handleDelete}
        title="Delete Prospect"
        description={`Are you sure you want to delete prospect ${deleteProspectItem?.prospectNo}? This will remove it from the pipeline. Won or lost prospects cannot be deleted.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Prospect"}
        variant="destructive"
        loading={isDeleting}
      />
    </>
  );
};

export default ProspectsView;
