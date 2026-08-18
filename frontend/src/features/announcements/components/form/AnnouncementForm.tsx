import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Megaphone, Save } from "lucide-react";

import FormField from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ROLES, type UserRole } from "@/constants/roles";
import { USER_ROLES } from "@/contracts/constants";
import {
  AnnouncementFormSchema,
  type AnnouncementFormValues,
} from "@/contracts/validation";
import type { AnnouncementListItem } from "@/contracts/types";
import {
  ANNOUNCEMENT_PLACEMENT_LABELS,
  ANNOUNCEMENT_SCOPE_LABELS,
  ANNOUNCEMENT_SEVERITY_LABELS,
} from "../../constants/labels";
import type { AnnouncementPayload } from "../../types";
import OrganizationMultiSelect from "./OrganizationMultiSelect";

interface AnnouncementFormProps {
  announcement?: AnnouncementListItem | null;
  viewerRole?: UserRole;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: AnnouncementPayload) => void;
}

const toDateTimeLocal = (iso: string | null): string => {
  if (!iso) return "";

  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromDateTimeLocal = (value: string | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

const emptyValues = (isSuperAdmin: boolean): AnnouncementFormValues => ({
  title: "",
  body: "",
  severity: "INFO",
  placement: "BELL",
  scope: isSuperAdmin ? "PLATFORM" : "ORGANIZATION",
  targetOrganizationIds: [],
  targetRoles: [],
  publishAt: "",
  expiresAt: "",
  dismissible: true,
});

const AnnouncementForm = ({
  announcement,
  viewerRole,
  isSubmitting,
  onCancel,
  onSubmit,
}: AnnouncementFormProps) => {
  const isSuperAdmin = viewerRole === ROLES.SUPER_ADMIN;
  const isEditing = Boolean(announcement);
  /**
   * SCHEDULED counts as locked, matching announcementService: it refuses an
   * audience change on PUBLISHED *or* SCHEDULED. Locking only PUBLISHED here
   * let the controls stay editable on a scheduled announcement and turned save
   * into an unexplained 409.
   */
  const audienceLocked =
    announcement?.status === "PUBLISHED" || announcement?.status === "SCHEDULED";

  const defaultValues = useMemo<AnnouncementFormValues>(() => {
    if (!announcement) return emptyValues(isSuperAdmin);

    return {
      title: announcement.title,
      body: announcement.body,
      severity: announcement.severity,
      placement: announcement.placement,
      scope: announcement.scope,
      targetOrganizationIds: announcement.targetOrganizationIds,
      targetRoles: announcement.targetRoles as UserRole[],
      publishAt: toDateTimeLocal(announcement.publishAt),
      expiresAt: toDateTimeLocal(announcement.expiresAt),
      dismissible: announcement.dismissible,
    };
  }, [announcement, isSuperAdmin]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(AnnouncementFormSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const severity = useWatch({ control, name: "severity" });
  const scope = useWatch({ control, name: "scope" });
  const showOrgPicker = isSuperAdmin && scope === "PLATFORM";

  useEffect(() => {
    if (severity === "CRITICAL") {
      setValue("placement", "BOTH", { shouldValidate: true });
    }
  }, [severity, setValue]);

  const submit = handleSubmit((values) => {
    onSubmit({
      title: values.title,
      body: values.body,
      severity: values.severity,
      placement: values.placement,
      scope: values.scope,
      targetOrganizationIds: values.targetOrganizationIds,
      targetRoles: values.targetRoles,
      publishAt: fromDateTimeLocal(values.publishAt),
      expiresAt: fromDateTimeLocal(values.expiresAt),
      dismissible: values.dismissible,
    });
  });

  return (
    <form onSubmit={submit} className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">
            {isEditing ? "Announcement Details" : "Announcement Creation"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Save Draft"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-6">
        <fieldset disabled={isSubmitting} className="flex flex-col gap-8">
          <FormField label="Title" required error={errors.title?.message}>
            <Input
              {...register("title")}
              placeholder="Scheduled maintenance on Sunday"
            />
          </FormField>

          <FormField
            label="Message"
            required
            error={errors.body?.message}
            description="Plain text only. Line breaks are preserved."
          >
            <textarea
              {...register("body")}
              rows={5}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="What do you need people to know?"
            />
          </FormField>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Severity" error={errors.severity?.message}>
              <Controller
                control={control}
                name="severity"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={Object.entries(ANNOUNCEMENT_SEVERITY_LABELS).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Where it shows"
              error={errors.placement?.message}
              description={
                severity === "CRITICAL"
                  ? "Critical announcements always include the banner."
                  : undefined
              }
            >
              <Controller
                control={control}
                name="placement"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={severity === "CRITICAL"}
                    options={Object.entries(ANNOUNCEMENT_PLACEMENT_LABELS).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                )}
              />
            </FormField>
          </div>

          {isSuperAdmin && (
            <FormField
              label="Scope"
              error={errors.scope?.message}
              description={
                audienceLocked
                  ? "The audience of a published or scheduled announcement cannot be changed. Archive it and create a new one."
                  : "Platform announcements reach every organization."
              }
            >
              <Controller
                control={control}
                name="scope"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={audienceLocked}
                    options={Object.entries(ANNOUNCEMENT_SCOPE_LABELS)
                      .filter(([value]) => value === "PLATFORM")
                      .map(([value, label]) => ({ value, label }))}
                  />
                )}
              />
            </FormField>
          )}

          {showOrgPicker && (
            <FormField
              label="Target organizations"
              error={errors.targetOrganizationIds?.message}
              description="Leave all unchecked to reach every organization."
            >
              <Controller
                control={control}
                name="targetOrganizationIds"
                render={({ field }) => (
                  <OrganizationMultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    disabled={audienceLocked}
                  />
                )}
              />
            </FormField>
          )}

          <FormField
            label="Limit to roles"
            error={errors.targetRoles?.message}
            description="Leave all unchecked to reach everyone in scope."
          >
            <Controller
              control={control}
              name="targetRoles"
              render={({ field }) => (
                <div className="flex flex-wrap gap-4 pt-1">
                  {USER_ROLES.filter((role) => role !== ROLES.SUPER_ADMIN).map(
                    (role) => {
                      const checked = field.value.includes(role as UserRole);

                      return (
                        <div key={role} className="flex items-center gap-2">
                          <Checkbox
                            id={`role-${role}`}
                            checked={checked}
                            disabled={audienceLocked}
                            onCheckedChange={(next) =>
                              field.onChange(
                                next
                                  ? [...field.value, role as UserRole]
                                  : field.value.filter((item) => item !== role),
                              )
                            }
                          />
                          <Label
                            htmlFor={`role-${role}`}
                            className="cursor-pointer text-sm font-medium"
                          >
                            {role
                              .charAt(0)
                              .concat(role.slice(1).toLowerCase())
                              .replace("_", " ")}
                          </Label>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            />
          </FormField>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              label="Starts"
              error={errors.publishAt?.message}
              description="Leave blank to go live as soon as it is published."
            >
              <Input type="datetime-local" {...register("publishAt")} />
            </FormField>

            <FormField
              label="Ends"
              error={errors.expiresAt?.message}
              description="Leave blank to stay up until archived."
            >
              <Input type="datetime-local" {...register("expiresAt")} />
            </FormField>
          </div>

          <FormField
            label="Allow people to dismiss it"
            layout="horizontal"
            error={errors.dismissible?.message}
          >
            <Controller
              control={control}
              name="dismissible"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </FormField>
        </fieldset>
      </div>
    </form>
  );
};

export default AnnouncementForm;
