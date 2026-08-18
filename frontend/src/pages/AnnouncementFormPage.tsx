import { Megaphone } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import EmptyState from "@/components/common/EmptyState";
import FormHeader from "@/components/common/FormHeader";
import LoadingState from "@/components/common/LoadingState";
import { Card } from "@/components/ui/card";
import { type UserRole } from "@/constants/roles";
import {
  AnnouncementForm,
  useAnnouncement,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  type AnnouncementPayload,
} from "@/features/announcements";
import { useAppSelector } from "@/hooks/useRedux";

const AnnouncementFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const viewerRole = user?.role as UserRole | undefined;
  const isEditing = Boolean(id);

  const { data, isLoading, error } = useAnnouncement(id);
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const announcement = data?.data;

  // Shared by both authoring roles — see AnnouncementsView.
  const listPath = "/announcements";

  const handleCancel = () => navigate(listPath);

  const handleSubmit = (payload: AnnouncementPayload) => {
    if (id) {
      updateAnnouncement.mutate(
        { id, payload },
        { onSuccess: handleCancel },
      );
      return;
    }

    createAnnouncement.mutate(payload, { onSuccess: handleCancel });
  };

  if (isEditing && isLoading) {
    return <LoadingState message="Loading announcement..." />;
  }

  if (isEditing && (error || !announcement)) {
    return (
      <EmptyState
        title="Announcement not found"
        description="The announcement you are trying to edit does not exist."
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-20px)] w-full flex-col overflow-hidden lg:h-[calc(100vh-40px)]">
      <div className="shrink-0">
        <FormHeader
          title={isEditing ? "Edit Announcement" : "Create Announcement"}
          icon={Megaphone}
          onBack={handleCancel}
        />
      </div>

      <div className="mt-6 flex-1 overflow-hidden pb-4">
        <Card className="flex h-full flex-col overflow-hidden border-border/60 bg-card shadow-sm">
          <div className="flex h-full flex-col overflow-hidden p-5 sm:p-6 lg:p-8">
            <AnnouncementForm
              announcement={announcement}
              viewerRole={viewerRole}
              isSubmitting={
                createAnnouncement.isPending || updateAnnouncement.isPending
              }
              onCancel={handleCancel}
              onSubmit={handleSubmit}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AnnouncementFormPage;
