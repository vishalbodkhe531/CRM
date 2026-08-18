import { Outlet } from "react-router-dom";
import { type ChangeEvent, useRef, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Camera,
  Loader2,
  LogOut,
  Mail,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";
import TooltipLabel from "@/components/common/TooltipLabel";
import { pagePanelClass } from "@/components/common/uiTokens";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import type { ApiError } from "@/types/api";
import { resolveAssetUrl } from "@/utils/assetUrl";
import { toast } from "@/utils/toast";
import { cn } from "@/utils/cn";
import { logout, updateProfile } from "../../store/slice";
import { selectCurrentUser } from "../../store/selectors";

const formatRole = (role?: string) => {
  if (!role) return "";

  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const AccountMetaItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value?: string | null;
}) => (
  <div className="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-3 py-2">
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
    </span>
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">
        {value || "-"}
      </dd>
    </div>
  </div>
);

const ProfileLayoutView = () => {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);

  if (!user) {
    return null;
  }

  const profileImageUrl = resolveAssetUrl(user.profileImage);
  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const organizationName = user.organization?.name ?? null;

  const handleProfileImageChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only jpg, jpeg, png, or webp images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Uploaded image must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    const payload = new FormData();
    payload.append("firstName", user.firstName ?? "");
    payload.append("lastName", user.lastName ?? "");
    payload.append("mobile", user.mobile ?? "");
    payload.append("profileImage", file);

    try {
      setIsUploadingProfileImage(true);
      // .unwrap() is what makes a rejected thunk throw. Without it the action
      // resolves either way, the catch never runs, and a failed upload just
      // stops the spinner as though it had worked.
      await dispatch(updateProfile(payload)).unwrap();
      toast.success("Profile photo updated.");
    } catch (error) {
      // The thunk rejects with an ApiError, so prefer the server's wording —
      // it explains *why* (file too large, wrong type) far better than we can.
      const message = (error as ApiError | undefined)?.message;
      toast.error(
        message || "Could not update your profile photo. Please try again.",
      );
    } finally {
      event.target.value = "";
      setIsUploadingProfileImage(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-4 lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
      <PageHeader
        title="Profile"
        description="Manage your account details, security, and quotation assets."
        className="shrink-0"
      />

      <div className="grid min-w-0 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:h-full lg:overflow-hidden">
          <section
            className={cn(
              pagePanelClass,
              "flex flex-col gap-4 lg:h-full",
            )}
          >
            <div className="space-y-4 ">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <button
                    type="button"
                    disabled={isUploadingProfileImage}
                    onClick={() => profileImageInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-bold text-muted-foreground ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Upload profile photo"
                  >
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt={userName || user.email}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="uppercase">
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </span>
                    )}
                  </button>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                  <TooltipLabel label="Upload profile photo">
                    <button
                      type="button"
                      disabled={isUploadingProfileImage}
                      onClick={() => profileImageInputRef.current?.click()}
                      className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-card bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Upload profile photo"
                    >
                      {isUploadingProfileImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipLabel>
                </div>

                <div className="mt-3 min-w-0">
                  <h2 className="truncate text-lg font-bold text-foreground">
                    {userName || user.email}
                  </h2>
                  <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
                    {formatRole(user.role)}
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-border border-y border-border">
                <AccountMetaItem icon={Mail} label="Email" value={user.email} />
                <AccountMetaItem
                  icon={BadgeCheck}
                  label="Role"
                  value={formatRole(user.role)}
                />
                {organizationName && (
                  <AccountMetaItem
                    icon={Building2}
                    label="Organization"
                    value={organizationName}
                  />
                )}
              </dl>
            </div>

            <div className="mt-auto space-y-2 border-t border-border pt-4">
              <TooltipLabel
                label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(isDarkMode ? "light" : "dark")}
                  aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                  className="h-9 w-full rounded-md border-border bg-background px-4 text-sm font-semibold text-foreground shadow-none hover:bg-muted"
                >
                  {isDarkMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {isDarkMode ? "Light Mode" : "Dark Mode"}
                </Button>
              </TooltipLabel>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void dispatch(logout());
                }}
                className="h-9 w-full rounded-md border-destructive/30 bg-background px-4 text-sm font-semibold text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </section>
        </aside>

        <div className="min-w-0 lg:h-full lg:overflow-y-auto lg:pr-2">
          <Outlet context={{ isProfileEditing, setIsProfileEditing }} />
        </div>
      </div>
    </div>
  );
};

export default ProfileLayoutView;
