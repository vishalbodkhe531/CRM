import { Button } from "@/components/ui/button";
import { Building2, Edit2 } from "lucide-react";
import type { Organization } from "../../types";
import { useOrganizationForm } from "../../hooks/useOrganizationForm";
import { OrgGeneralInfo, OrgContactInfo, OrgAdminCredentials, OrgPdfAssets } from "./OrganizationFormSections";

interface OrganizationEditFormProps {
  organization?: Organization;
  isAdding?: boolean;
  isEditing: boolean;
  setIsEditing: (active: boolean) => void;
}

const OrganizationEditForm = ({
  organization,
  isEditing,
  setIsEditing,
  isAdding,
}: OrganizationEditFormProps) => {
  const { 
    form, 
    onSubmit, 
    isSubmitting, 
    handleSlugChange, 
    handlePrefixChange, 
    handleGstinChange,
    assetPreviews,
    handleAssetChange,
  } = useOrganizationForm({
    organization,
    isAdding,
    setIsEditing,
  });

  const actionLoading = isSubmitting;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <form onSubmit={onSubmit} className="flex h-full flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-border/40 pb-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              {isAdding ? "Organization Creation" : "Organization Details"}
            </h2>
          </div>
          <div className="flex gap-2">
            {isAdding ? (
              <Button type="submit" size="sm" disabled={actionLoading}>
                {actionLoading ? "Creating..." : "Create Organization"}
              </Button>
            ) : !isEditing ? (
              <Button type="button" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-6">
          <fieldset
            disabled={!isEditing && !isAdding}
            className="flex flex-col gap-8 disabled:opacity-95"
          >
            <OrgGeneralInfo 
              form={form} 
              handleSlugChange={handleSlugChange} 
              handlePrefixChange={handlePrefixChange} 
            />

            <OrgContactInfo 
              form={form} 
              handleGstinChange={handleGstinChange} 
            />

            <OrgPdfAssets
              organization={organization}
              assetPreviews={assetPreviews}
              handleAssetChange={handleAssetChange}
            />

            {isAdding && <OrgAdminCredentials form={form} />}
          </fieldset>
        </div>
      </form>
    </div>
  );
};

export default OrganizationEditForm;
