import { useLeadForm } from "../../hooks/useLeadForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserCircle } from "lucide-react";
import { LeadFormSections } from "./LeadFormSections";
import LeadProfilePhoto from "../shared/LeadProfilePhoto";
import FormHeader from "@/components/common/FormHeader";
import type { Lead } from "../../types";

interface LeadFormProps {
  mode: "create" | "edit";
  lead?: Lead;
}

const LeadForm = ({ mode, lead }: LeadFormProps) => {
  const {
    form,
    items,
    assignableUsers,
    profilePicPreview,
    isExecutive,
    isSubmitting,
    handleCancel,
    handleImageChange,
    onSubmit,
    isAdding,
  } = useLeadForm({ mode, lead });

  return (
    <div className="flex w-full flex-col h-full overflow-hidden">
      <div className="shrink-0 px-1">
        <FormHeader
          title={
            isAdding
              ? "Add Lead"
              : `Edit Lead: ${[lead?.firstName, lead?.lastName].filter(Boolean).join(" ")}`
          }
          icon={UserCircle}
          avatarSrc={profilePicPreview ?? undefined}
          onBack={handleCancel}
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-6 mt-6 scrollbar-hide">
        <Card className="border-border/60 bg-card p-4 sm:p-6 lg:p-8 overflow-visible h-auto leading-relaxed shadow-sm">
          <form className="space-y-8 sm:space-y-10" onSubmit={onSubmit}>
            <LeadProfilePhoto 
              watchProfilePic={profilePicPreview}
              onImageChange={handleImageChange}
            />

            <div className="mt-6 sm:mt-8">
              <LeadFormSections
                form={form}
                items={items}
                assignableUsers={assignableUsers}
                lead={lead}
                isAdding={isAdding}
                isExecutive={isExecutive}
                mode={mode === "edit" ? "edit" : "create"}
              />
            </div>

            <div className="flex flex-col-reverse items-stretch gap-3 pt-8 mt-10 border-t border-border/30 sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:mt-12">
              <Button
                variant="outline"
                type="button"
                onClick={handleCancel}
                className="h-11 px-8 rounded-full border-border/50 bg-background hover:bg-accent/50 hover:text-accent-foreground transition-all font-bold"
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
                  : isAdding
                    ? "Create Lead"
                    : "Save Changes"}
              </Button> 
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LeadForm;
