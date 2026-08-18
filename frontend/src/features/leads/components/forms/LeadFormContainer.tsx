import { useLeadForm } from "../../hooks/useLeadForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserCircle, Pencil } from "lucide-react";
import { LeadFormSections } from "./LeadFormSections";
import LeadProfilePhoto from "../shared/LeadProfilePhoto";
import FormHeader from "@/components/common/FormHeader";
import type { Lead } from "../../types";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { ROLES } from "@/constants/roles";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

interface LeadFormContainerProps {
  mode: "view" | "edit" | "create";
  lead?: Lead;
  onCancel: () => void;
  hideHeader?: boolean;
}

const LeadFormContainer = ({
  mode,
  lead,
  onCancel,
  hideHeader = false,
}: LeadFormContainerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.SUPER_ADMIN;
  const isConverted = !!lead?.isConverted;
  const isDisabled = isView || (isConverted && !isAdmin);

  const {
    form,
    items,
    assignableUsers,
    profilePicPreview,
    isExecutive,
    isSubmitting,
    handleImageChange,
    onSubmit: originalOnSubmit,
    isAdding,
  } = useLeadForm({ mode: isView ? "edit" : mode, lead }); // useLeadForm internal mode is still edit/create

  const handleEditClick = () => {
    if (!lead) return;
    navigate(scopedPath(`/leads/${lead.id}?mode=edit`));
  };

  const onSubmit = (e: React.FormEvent) => {
    if (isView) {
      e.preventDefault();
      return;
    }
    originalOnSubmit(e);
  };

  const fullName = [lead?.firstName, lead?.lastName].filter(Boolean).join(" ");
  const headerTitle = isCreate ? "Add Lead" : isEdit ? `Edit Lead: ${fullName}` : `Lead Details: ${fullName}`;

  return (
    <div className="flex w-full flex-col h-full overflow-hidden">
      {!hideHeader && (
        <div className="shrink-0 px-1">
          <FormHeader
            title={headerTitle}
            icon={UserCircle}
            avatarSrc={profilePicPreview ?? undefined}
            onBack={onCancel}
            action={
              isView && lead ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditClick}
                  className="flex items-center gap-2 h-10 px-6 rounded-full border-border/50 bg-background hover:bg-muted font-bold shadow-sm transition-all"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Edit Lead</span>
                </Button>
              ) : null
            }
          />
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto scrollbar-hide ${
          hideHeader ? "mt-0" : "mt-5"
        }`}
      >
        <Card className="border-border/60 bg-card p-4 sm:p-5 lg:p-6 overflow-visible h-auto leading-relaxed shadow-sm">
          <form className="space-y-3" onSubmit={onSubmit}>
            <LeadProfilePhoto
              watchProfilePic={profilePicPreview}
              onImageChange={handleImageChange}
              disabled={isDisabled}
            />

            <div className="mt-6 sm:mt-8">
              <LeadFormSections
                form={form}
                items={items}
                assignableUsers={assignableUsers}
                lead={lead}
                isAdding={isAdding}
                isExecutive={isExecutive}
                mode={mode}
              />
            </div>

            {!isDisabled && (
              <div className="mt-5 flex flex-col-reverse items-stretch gap-3 border-t border-border/30 pt-5 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  variant="outline"
                  type="button"
                  onClick={onCancel}
                  className="h-11 px-8 rounded-full font-bold border-border/50 bg-background hover:bg-accent/50 hover:text-accent-foreground transition-all shadow-sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 px-10 rounded-full font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm transform active:scale-95 transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Saving..."
                    : isCreate
                      ? "Create Lead"
                      : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LeadFormContainer;
