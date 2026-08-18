import { Camera, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfilePicUrl } from "../../utils/profilePicUrl";

interface LeadProfilePhotoProps {
  watchProfilePic?: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const LeadProfilePhoto = ({
  watchProfilePic,
  onImageChange,
  disabled,
}: LeadProfilePhotoProps) => {
  // Resolve relative backend paths to full URLs
  const resolvedSrc = getProfilePicUrl(watchProfilePic);

  return (
    <div className="flex items-center gap-6 mb-3 group">
      <div className="relative group">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-primary/10 bg-muted/30 shadow-inner  transition-all">
          {resolvedSrc ? (
            <img
              src={resolvedSrc}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <UserCircle className="h-10 w-10 text-muted-foreground/60" />
          )}
        </div>
        {!disabled && (
          <Label
            htmlFor="profile-picture-edit"
            className="absolute inset-0 cursor-pointer rounded-full bg-black/0 group-hover:bg-black/5 transition-all outline-none"
          >
            <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-primary-foreground shadow-sm ">
              <Camera className="h-4 w-4" aria-hidden="true" />
            </span>
            <Input
              id="profile-picture-edit"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={onImageChange}
            />
          </Label>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">
          Lead Profile Photo
        </h3>
        <p className="text-xs text-muted-foreground">
          {disabled
            ? "Profile photo for this lead."
            : "Upload a clear photo for better recognition."}
        </p>
      </div>
    </div>
  );
};

export default LeadProfilePhoto;
