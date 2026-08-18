import {
  useEffect,
  useState,
  type ChangeEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useOutletContext } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ChevronUp,
  FileUp,
  ImageIcon,
  Pencil,
  QrCode,
  Save,
  ShieldCheck,
  Signature,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import FormField from "@/components/common/FormField";
import PdfAssetUploader from "@/components/common/PdfAssetUploader";
import { pagePanelClass } from "@/components/common/uiTokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { resolveAssetUrl } from "@/utils/assetUrl";
import { toast } from "@/utils/toast";
import { cn } from "@/utils/cn";
import {
  UpdateProfileSchema,
  type UpdateProfileInput as UpdateProfileForm,
} from "@/contracts/validation";
import { updateProfile } from "../../store/slice";
import { selectCurrentUser } from "../../store/selectors";
import ChangePasswordForm from "./ChangePasswordForm";

const inputClassName =
  "h-9 rounded-md border-0 bg-[rgb(var(--input-editable))] px-4 text-sm text-foreground shadow-none placeholder:text-muted-foreground/60 hover:bg-muted/70 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/25 dark:bg-muted/50 dark:focus-visible:bg-background";
const readOnlyInputClassName = `${inputClassName} cursor-not-allowed text-foreground hover:bg-[rgb(var(--input-editable))] focus-visible:bg-[rgb(var(--input-editable))] focus-visible:ring-0`;
type OrganizationAssetField = "companyLogo" | "qrCode" | "signature";
type ProfileOutletContext = {
  isProfileEditing: boolean;
  setIsProfileEditing: Dispatch<SetStateAction<boolean>>;
};

const assetConfig: {
  field: OrganizationAssetField;
  label: string;
  icon: LucideIcon;
  previewClassName: string;
}[] = [
  {
    field: "companyLogo",
    label: "Company Logo",
    icon: ImageIcon,
    previewClassName: "h-8 w-12 object-contain",
  },
  {
    field: "qrCode",
    label: "QR Code",
    icon: QrCode,
    previewClassName: "h-9 w-9 object-contain",
  },
  {
    field: "signature",
    label: "Signature",
    icon: Signature,
    previewClassName: "h-8 w-12 object-contain",
  },
];

const formatJoiningDate = (joiningDate?: string | null) => {
  if (!joiningDate) {
    return "-";
  }

  const parsedDate = new Date(joiningDate);
  return Number.isNaN(parsedDate.getTime())
    ? "-"
    : parsedDate.toLocaleDateString();
};

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-bold leading-tight text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-xs font-medium leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
    {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
  </div>
);

const PersonalInfoForm = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const { isProfileEditing, setIsProfileEditing } =
    useOutletContext<ProfileOutletContext>();
  const [assetFiles, setAssetFiles] = useState<
    Partial<Record<OrganizationAssetField, File>>
  >({});
  const [assetPreviews, setAssetPreviews] = useState<
    Partial<Record<OrganizationAssetField, string>>
  >({});
  const [uploadingAssetField, setUploadingAssetField] =
    useState<OrganizationAssetField | null>(null);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(true);
  const form = useForm<UpdateProfileForm>({
    resolver: zodResolver(UpdateProfileSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      mobile: "",
    },
  });

  useEffect(() => {
    if (!user || isProfileEditing) {
      return;
    }

    form.reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      mobile: user.mobile ?? "",
    });
  }, [form, isProfileEditing, user]);

  if (!user) {
    return null;
  }

  const isOrgRole =
    user.role === "ADMIN" ||
    user.role === "MANAGER" ||
    user.role === "EXECUTIVE";
  const canManageQuotationAssets =
    user.role === "ADMIN" || user.role === "MANAGER";
  const canChangePassword =
    user.role !== "MANAGER" && user.role !== "EXECUTIVE";
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = form;

  const onSubmit = async (data: UpdateProfileForm) => {
    const profilePayload = {
      firstName: data.firstName?.trim(),
      lastName: data.lastName?.trim(),
      mobile: data.mobile?.trim() || null,
    };
    const hasAssetFiles = Object.keys(assetFiles).length > 0;
    const payload = hasAssetFiles ? new FormData() : profilePayload;

    if (payload instanceof FormData) {
      payload.append("firstName", profilePayload.firstName ?? "");
      payload.append("lastName", profilePayload.lastName ?? "");
      payload.append("mobile", profilePayload.mobile ?? "");
      Object.entries(assetFiles).forEach(([field, file]) => {
        if (file) payload.append(field, file);
      });
    }

    const result = await dispatch(updateProfile(payload));

    if (updateProfile.fulfilled.match(result)) {
      form.reset({
        firstName: result.payload.user.firstName ?? "",
        lastName: result.payload.user.lastName ?? "",
        mobile: result.payload.user.mobile ?? "",
      });
      Object.values(assetPreviews).forEach((preview) =>
        URL.revokeObjectURL(preview),
      );
      setAssetFiles({});
      setAssetPreviews({});
      if (isProfileEditing) {
        setIsProfileEditing(false);
      }
    }
  };

  const handleAssetChange =
    (field: OrganizationAssetField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
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

      setAssetFiles((prev) => ({ ...prev, [field]: file }));
      setAssetPreviews((prev) => {
        if (prev[field]) URL.revokeObjectURL(prev[field]);
        return { ...prev, [field]: URL.createObjectURL(file) };
      });
      event.target.value = "";

      const payload = new FormData();
      payload.append("firstName", user.firstName ?? "");
      payload.append("lastName", user.lastName ?? "");
      payload.append("mobile", user.mobile ?? "");
      payload.append(field, file);

      setUploadingAssetField(field);
      void dispatch(updateProfile(payload)).then((result) => {
        if (updateProfile.fulfilled.match(result)) {
          form.reset({
            firstName: result.payload.user.firstName ?? "",
            lastName: result.payload.user.lastName ?? "",
            mobile: result.payload.user.mobile ?? "",
          });
          setAssetFiles((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
          });
          setAssetPreviews((prev) => {
            if (prev[field]) URL.revokeObjectURL(prev[field]);
            const next = { ...prev };
            delete next[field];
            return next;
          });
        }
        setUploadingAssetField((current) =>
          current === field ? null : current,
        );
      });
    };

  return (
    <div className="min-w-0 space-y-4">
      <section className={cn(pagePanelClass, "space-y-5")}>
        <form
          id="profile-details-form"
          onSubmit={handleSubmit(onSubmit)}
          className="min-w-0 space-y-5"
        >
          <SectionHeader
            icon={UserRound}
            title="Personal Information"
            description="Update your personal details and manage your account information."
            action={
              <>
                {isProfileEditing && (
                  <span className="inline-flex h-7 items-center rounded-md border border-primary/20 bg-primary/10 px-2.5 text-xs font-semibold text-primary">
                    Editing
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setIsProfileEditing((editing) => !editing)}
                  className="h-8 rounded-md border-border bg-background px-3 text-xs font-semibold text-foreground shadow-none hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {isProfileEditing ? "Cancel" : "Edit"}
                </Button>
              </>
            }
          />

          <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4 *:min-w-0">
            <FormField
              label="First Name"
              error={errors.firstName?.message}
              required
            >
              <Input
                {...register("firstName")}
                readOnly={!isProfileEditing}
                aria-readonly={!isProfileEditing}
                className={
                  isProfileEditing ? inputClassName : readOnlyInputClassName
                }
              />
            </FormField>

            <FormField
              label="Last Name"
              error={errors.lastName?.message}
              required
            >
              <Input
                {...register("lastName")}
                readOnly={!isProfileEditing}
                aria-readonly={!isProfileEditing}
                className={
                  isProfileEditing ? inputClassName : readOnlyInputClassName
                }
              />
            </FormField>

            <FormField
              label="Phone Number"
              error={errors.mobile?.message}
            >
              <Input
                {...register("mobile")}
                readOnly={!isProfileEditing}
                aria-readonly={!isProfileEditing}
                className={
                  isProfileEditing ? inputClassName : readOnlyInputClassName
                }
              />
            </FormField>

            <FormField label="Email">
              <Input
                value={user.email ?? ""}
                type="email"
                disabled
                className={readOnlyInputClassName}
              />
            </FormField>

            {isOrgRole && (
              <>
                <FormField label="Organization Prefix">
                  <Input
                    value={user.organization?.prefix ?? "-"}
                    disabled
                    className={readOnlyInputClassName}
                  />
                </FormField>

                <FormField label="Employee ID">
                  <Input
                    value={user.employeeId ?? "-"}
                    disabled
                    className={readOnlyInputClassName}
                  />
                </FormField>

                <FormField label="Designation">
                  <Input
                    value={user.designation ?? "-"}
                    disabled
                    className={readOnlyInputClassName}
                  />
                </FormField>

                <FormField label="Joining Date">
                  <Input
                    value={formatJoiningDate(user.joiningDate)}
                    disabled
                    className={readOnlyInputClassName}
                  />
                </FormField>
              </>
            )}
          </div>

          {isProfileEditing && (
            <div className="flex justify-stretch border-t border-border pt-5 sm:justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 w-full rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-none hover:bg-primary-hover sm:w-auto"
              >
                <Save className="h-3.5 w-3.5" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </form>
      </section>

      {canChangePassword && (
        <section className={cn(pagePanelClass, "space-y-5")}>
          <SectionHeader
            icon={ShieldCheck}
            title="Security"
            description="Update your password to keep your account secure."
            action={
              <button
                type="button"
                onClick={() => setIsSecurityOpen((open) => !open)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={isSecurityOpen}
                aria-label={
                  isSecurityOpen ? "Collapse security" : "Expand security"
                }
              >
                <ChevronUp
                  className={`h-4 w-4 transition-transform ${
                    isSecurityOpen ? "" : "rotate-180"
                  }`}
                />
              </button>
            }
          />
          {isSecurityOpen && (
            <div>
              <ChangePasswordForm variant="embedded" />
            </div>
          )}
        </section>
      )}

      {canManageQuotationAssets && (
        <section className={cn(pagePanelClass, "space-y-5")}>
          <SectionHeader
            icon={FileUp}
            title="Quotation PDF Assets"
            description="Upload or update the assets that will appear in your quotation PDF."
            action={
              <button
                type="button"
                onClick={() => setIsAssetsOpen((open) => !open)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={isAssetsOpen}
                aria-label={
                  isAssetsOpen ? "Collapse PDF assets" : "Expand PDF assets"
                }
              >
                <ChevronUp
                  className={`h-4 w-4 transition-transform ${
                    isAssetsOpen ? "" : "rotate-180"
                  }`}
                />
              </button>
            }
          />
          {isAssetsOpen && (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 *:min-w-0">
              {assetConfig.map((asset) => {
                const currentValue = user.organization?.[asset.field] ?? null;
                const previewUrl =
                  assetPreviews[asset.field] ?? resolveAssetUrl(currentValue);
                const inputId = `profile-${asset.field}`;

                return (
                  <PdfAssetUploader
                    key={asset.field}
                    id={inputId}
                    label={asset.label}
                    icon={asset.icon}
                    previewUrl={previewUrl}
                    previewClassName={asset.previewClassName}
                    onChange={handleAssetChange(asset.field)}
                    disabled={isSubmitting || uploadingAssetField !== null}
                    isUploading={uploadingAssetField === asset.field}
                    compact
                  />
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default PersonalInfoForm;
