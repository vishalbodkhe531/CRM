import FormField from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAssignableUsers } from "@/features/leads";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Lock,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useLocation } from "react-router-dom";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";
import {
  prospectActivityTypeOptions,
  prospectFollowUpTypeOptions,
  prospectReminderOptions,
  prospectStageOptions,
} from "../../constants/options";
import {
  useCreateProspectActivity,
  useUpdateProspect,
  useUpdateProspectFollowUp,
  useUpdateProspectStage,
} from "../../hooks/useProspectMutations";
import type { Prospect } from "../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type BasicInfoValues = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  alternateMobile: string;
  website: string;
  linkedInProfile: string;
  leadSource: string;
  industry: string;
  address: string;
  productInterested: string;
  companyName: string;
  expectedValue: string;
  assignedToId: string;
  notes: string;
};

type StageValues = {
  stage: Prospect["stage"];
  comment: string;
};

type FollowUpValues = {
  date: string;
  time: string;
  type: string;
  reminder: string;
  assignedToId: string;
  notes: string;
};

type ActivityValues = {
  type: "CALL" | "MEETING";
  occurredAt: string;
  title: string;
  outcome: string;
  durationMinutes: string;
  attendees: string;
  notes: string;
};

type EmailValues = {
  occurredAt: string;
  title: string;
  outcome: string;
  notes: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (value?: string | null, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(
    "en-IN",
    withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" },
  );
};

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const toDateTimeLocalInput = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toNullableString = (value?: string) => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
};

const getOptionLabel = (
  options: Array<{ label: string; value: string }>,
  value?: string | null,
) => options.find((o) => o.value === value)?.label ?? "-";

const formatLeadAddress = (lead?: Prospect["lead"]) => {
  const parts = [lead?.address, lead?.city, lead?.state, lead?.pinCode].filter(
    (part): part is string => Boolean(part?.trim()),
  );

  return parts.length > 0 ? parts.join(", ") : null;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single label + value row in the info panel */

const InfoRow = ({
  label,
  value,
  required,
  link,
}: {
  label: string;
  value?: string | null;
  required?: boolean;
  link?: boolean;
}) => (
  <div className="grid grid-cols-[160px_1fr] items-start border-b border-slate-200/70 px-5 py-3 last:border-0 dark:border-border">
    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
      {label}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </span>

    <span
      className={
        value
          ? link
            ? "text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            : "text-sm text-foreground"
          : "text-sm italic text-slate-400 dark:text-slate-500"
      }
    >
      {value || "—"}
    </span>
  </div>
);

/** A date/time pill used in the timeline */
const InfoPill = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
    {icon}
    {label}
  </div>
);

/** Renders one activity entry (call, email, etc.) */
const _ActivityEntry = ({
  activity,
}: {
  // activity: Prospect["activities"][number];

  activity: {
    id: string;
    type: string;
    summary: string;
    createdAt: string;
    createdBy?: { firstName: string; lastName: string } | null;
    details?: string | null;
  };
}) => {
  const isEmail = activity.type === "EMAIL";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {isEmail ? (
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {isEmail ? "Email" : "Call"}
      </div>
      <div className="flex flex-wrap gap-2">
        <InfoPill
          icon={<Calendar className="h-3 w-3" />}
          label={`Date   ${formatDate(activity.createdAt)}`}
        />
        <InfoPill
          icon={<Clock className="h-3 w-3" />}
          label={`Time : ${new Date(activity.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`}
        />
      </div>
      {activity.summary ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Discussion</p>
          <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-foreground">
            {activity.summary}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const textareaClassName =
  "w-full resize-none rounded-xl border border-input bg-card px-3 py-2.5 text-sm shadow-sm outline-none transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

// ─── Main Component ────────────────────────────────────────────────────────────

interface ProspectFormContainerProps {
  prospect: Prospect;
  onBack: () => void;
}

const ProspectFormContainer = ({
  prospect,
  onBack,
}: ProspectFormContainerProps) => {
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const { data: assignableUsers = [] } = useAssignableUsers();
  const { mutateAsync: updateProspect, isPending: isUpdatingBasicInfo } =
    useUpdateProspect();
  const { mutateAsync: updateStage, isPending: isUpdatingStage } =
    useUpdateProspectStage();
  const { mutateAsync: updateFollowUp, isPending: isUpdatingFollowUp } =
    useUpdateProspectFollowUp();
  const { mutateAsync: createActivity, isPending: isCreatingActivity } =
    useCreateProspectActivity();

  const [activeTab, setActiveTab] = useState<"timeline" | "followup">(
    "timeline",
  );
  const [editMode, setEditMode] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  const assigneeOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...assignableUsers.map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}`,
      })),
    ],
    [assignableUsers],
  );

  // ── Forms ──────────────────────────────────────────────────────────────────

  const basicInfoForm = useForm<BasicInfoValues>({
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      firstName: prospect.lead?.firstName ?? "",
      lastName: prospect.lead?.lastName ?? "",
      email: prospect.lead?.email ?? "",
      mobile: prospect.lead?.mobile ?? "",
      alternateMobile: prospect.lead?.alternateMobile ?? "",
      website: prospect.lead?.website ?? "",
      linkedInProfile: prospect.lead?.linkedInProfile ?? "",
      leadSource: prospect.lead?.source ?? "",
      industry: prospect.lead?.industry ?? "",
      address: formatLeadAddress(prospect.lead) ?? "",
      productInterested:
        prospect.lead?.productInterest?.name ??
        prospect.lead?.productInterested ??
        "",
      companyName: prospect.lead?.companyName ?? "",
      expectedValue: prospect.expectedValue
        ? String(prospect.expectedValue)
        : "",
      assignedToId: prospect.assignedToId ?? "",
      notes: prospect.notes ?? "",
    },
  });

  const stageForm = useForm<StageValues>({
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { stage: prospect.stage, comment: "" },
  });

  const followUpForm = useForm<FollowUpValues>({
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      date: toDateInput(prospect.followUp?.date),
      time: prospect.followUp?.time ?? "",
      type: prospect.followUp?.type ?? "",
      reminder: prospect.followUp?.reminder ?? "",
      assignedToId:
        prospect.followUp?.assignedToId ?? prospect.assignedToId ?? "",
      notes: prospect.followUp?.notes ?? "",
    },
  });

  const activityForm = useForm<ActivityValues>({
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      type: "CALL",
      occurredAt: toDateTimeLocalInput(null),
      title: "",
      outcome: "",
      durationMinutes: "",
      attendees: "",
      notes: "",
    },
  });

  const emailForm = useForm<EmailValues>({
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      occurredAt: toDateTimeLocalInput(null),
      title: `Email to ${prospect.lead?.companyName || prospect.prospectNo}`,
      outcome: "",
      notes: "",
    },
  });

  useEffect(() => {
    basicInfoForm.reset({
      firstName: prospect.lead?.firstName ?? "",
      lastName: prospect.lead?.lastName ?? "",
      email: prospect.lead?.email ?? "",
      mobile: prospect.lead?.mobile ?? "",
      alternateMobile: prospect.lead?.alternateMobile ?? "",
      website: prospect.lead?.website ?? "",
      linkedInProfile: prospect.lead?.linkedInProfile ?? "",
      leadSource: prospect.lead?.source ?? "",
      industry: prospect.lead?.industry ?? "",
      address: formatLeadAddress(prospect.lead) ?? "",
      productInterested:
        prospect.lead?.productInterest?.name ??
        prospect.lead?.productInterested ??
        "",
      companyName: prospect.lead?.companyName ?? "",
      expectedValue: prospect.expectedValue
        ? String(prospect.expectedValue)
        : "",
      assignedToId: prospect.assignedToId ?? "",
      notes: prospect.notes ?? "",
    });
    stageForm.reset({ stage: prospect.stage, comment: "" });
    followUpForm.reset({
      date: toDateInput(prospect.followUp?.date),
      time: prospect.followUp?.time ?? "",
      type: prospect.followUp?.type ?? "",
      reminder: prospect.followUp?.reminder ?? "",
      assignedToId:
        prospect.followUp?.assignedToId ?? prospect.assignedToId ?? "",
      notes: prospect.followUp?.notes ?? "",
    });
    emailForm.reset({
      occurredAt: toDateTimeLocalInput(null),
      title: `Email to ${prospect.lead?.companyName || prospect.prospectNo}`,
      outcome: "",
      notes: "",
    });
  }, [basicInfoForm, emailForm, followUpForm, prospect, stageForm]);

  const selectedStage = useWatch({ control: stageForm.control, name: "stage" });
  const selectedActivityType = useWatch({
    control: activityForm.control,
    name: "type",
  });
  const hasPendingStageChange = selectedStage !== prospect.stage;
  const canLaunchEmail = Boolean(prospect.lead?.email) && prospect.isEditable;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleBasicInfoSubmit = basicInfoForm.handleSubmit(async (values) => {
    await updateProspect({
      id: prospect.id,
      data: {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        mobile: values.mobile.trim(),
        companyName: values.companyName.trim(),
        expectedValue:
          values.expectedValue.trim() === ""
            ? null
            : Number(values.expectedValue),
        assignedToId: toNullableString(values.assignedToId),
        notes: toNullableString(values.notes),
      },
    });
    setEditMode(false);
  });

  const handleStageSubmit = stageForm.handleSubmit(async (values) => {
    if (values.stage === prospect.stage) return;
    if (values.comment.trim().length < 10) {
      stageForm.setError("comment", {
        type: "manual",
        message: "Comment must be at least 10 characters",
      });
      return;
    }
    await updateStage({
      id: prospect.id,
      data: { stage: values.stage, comment: values.comment.trim() },
    });
    setStageDialogOpen(false);
  });

  const handleFollowUpSubmit = followUpForm.handleSubmit(async (values) => {
    if (!values.date) {
      followUpForm.setError("date", {
        type: "manual",
        message: "Next follow-up date is required",
      });
      return;
    }
    if (!values.type) {
      followUpForm.setError("type", {
        type: "manual",
        message: "Follow-up type is required",
      });
      return;
    }

    await updateFollowUp({
      id: prospect.id,
      data: {
        date: values.date,
        time: values.time.trim() || null,
        type: values.type as NonNullable<Prospect["followUp"]>["type"],
        reminder:
          values.reminder.trim() === ""
            ? null
            : (values.reminder as NonNullable<
                Prospect["followUp"]
              >["reminder"]),
        assignedToId: toNullableString(values.assignedToId),
        notes: toNullableString(values.notes),
      },
    });

    setFollowUpDialogOpen(false);
  });

  const handleActivitySubmit = activityForm.handleSubmit(async (values) => {
    await createActivity({
      id: prospect.id,
      data: {
        type: values.type,
        occurredAt: new Date(values.occurredAt).toISOString(),
        title: values.title.trim(),
        outcome: toNullableString(values.outcome),
        durationMinutes:
          values.type === "CALL" && values.durationMinutes.trim() !== ""
            ? Number(values.durationMinutes)
            : null,
        attendees:
          values.type === "MEETING" ? toNullableString(values.attendees) : null,
        notes: toNullableString(values.notes),
      },
    });
    activityForm.reset({
      type: values.type,
      occurredAt: toDateTimeLocalInput(null),
      title: "",
      outcome: "",
      durationMinutes: "",
      attendees: "",
      notes: "",
    });
    setActivityDialogOpen(false);
  });

  const handleEmailSubmit = emailForm.handleSubmit(async (values) => {
    await createActivity({
      id: prospect.id,
      data: {
        type: "EMAIL",
        occurredAt: new Date(values.occurredAt).toISOString(),
        title: values.title.trim(),
        outcome: toNullableString(values.outcome),
        notes: toNullableString(values.notes),
      },
    });
    setEmailDialogOpen(false);
    emailForm.reset({
      occurredAt: toDateTimeLocalInput(null),
      title: `Email to ${prospect.lead?.companyName || prospect.prospectNo}`,
      outcome: "",
      notes: "",
    });
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen">
      {/* ── Page header ── */}
      <div className="mb-4 flex items-center justify-between ">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Prospect Detail
          </h1>
        </div>
      </div>

      {/* ── Read-only banner ── */}
      {!prospect.isEditable ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            This prospect is in a terminal stage.
          </span>
          <span className="text-muted-foreground">
            Won and lost prospects are read-only.
          </span>
        </div>
      ) : null}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 h-[90%] overflow-y-auto pr-2 m-2">
      {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2 h-[30rem] overflow-y-auto pr-2 m-2"> */}
        {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2 h-full overflow-y-auto pr-2"> */}
        {/* ── LEFT: Info panel ── */}
        <Card className="overflow-y-auto  border-border/60 bg-card py-0 shadow-sm ">
          {/* <div className="flex justify-end border-b border-border/40 px-4 py-2.5"> */}
          <div className="sticky top-1 z-10 flex justify-end border-b border-border/40 bg-card">
            {prospect.isEditable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditMode((v) => !v)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {editMode ? "Cancel" : "Edit"}
              </Button>
            ) : null}
          </div>

          {editMode ? (
            <form
              className="space-y-4  px-4 py-4"
              onSubmit={handleBasicInfoSubmit}
            >
              <div className="grid grid-cols-1  gap-4 sm:grid-cols-2">
                <FormField
                  label="First Name"
                  required
                  error={basicInfoForm.formState.errors.firstName?.message}
                >
                  <Input
                    {...basicInfoForm.register("firstName", {
                      required: "First name is required",
                    })}
                  />
                </FormField>
                <FormField
                  label="Last Name"
                  required
                  error={basicInfoForm.formState.errors.lastName?.message}
                >
                  <Input
                    {...basicInfoForm.register("lastName", {
                      required: "Last name is required",
                    })}
                  />
                </FormField>
                <FormField
                  label="Company Name"
                  required
                  error={basicInfoForm.formState.errors.companyName?.message}
                >
                  <Input
                    {...basicInfoForm.register("companyName", {
                      required: "Company name is required",
                    })}
                  />
                </FormField>
                <FormField
                  label="Email Address"
                  required
                  error={basicInfoForm.formState.errors.email?.message}
                >
                  <Input
                    {...basicInfoForm.register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /\S+@\S+\.\S+/,
                        message: "Valid email is required",
                      },
                    })}
                    type="email"
                  />
                </FormField>
                <FormField
                  label="Mobile No"
                  required
                  error={basicInfoForm.formState.errors.mobile?.message}
                >
                  <Input
                    {...basicInfoForm.register("mobile", {
                      required: "Mobile number is required",
                      pattern: {
                        value: /^\+?[0-9]{10,15}$/,
                        message: "Phone number must be 10-15 digits",
                      },
                    })}
                  />
                </FormField>
                <FormField label="Alternate Mobile No">
                  <Input {...basicInfoForm.register("alternateMobile")} />
                </FormField>
                <FormField label="Website">
                  <Input {...basicInfoForm.register("website")} />
                </FormField>
                <FormField label="LinkedIn Profile">
                  <Input {...basicInfoForm.register("linkedInProfile")} />
                </FormField>
                <FormField label="Lead Source">
                  <Input {...basicInfoForm.register("leadSource")} />
                </FormField>
                <FormField label="Industry">
                  <Input {...basicInfoForm.register("industry")} />
                </FormField>
                <FormField label="Address" className="sm:col-span-2">
                  <Input {...basicInfoForm.register("address")} />
                </FormField>
                <FormField
                  label="Product Interested"
                  required
                  className="sm:col-span-2"
                >
                  <Input {...basicInfoForm.register("productInterested")} />
                </FormField>
                <FormField label="Assign" required>
                  <Controller
                    name="assignedToId"
                    control={basicInfoForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        onOpenChange={(open) => {
                          if (!open) field.onBlur();
                        }}
                        options={assigneeOptions}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Expected Value (INR)">
                  <Input
                    {...basicInfoForm.register("expectedValue")}
                    type="number"
                    min="0"
                  />
                </FormField>
              </div>
              <FormField label="Notes">
                <textarea
                  {...basicInfoForm.register("notes")}
                  rows={3}
                  className={textareaClassName}
                  placeholder="Add internal notes"
                />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isUpdatingBasicInfo}>
                  <Save className="h-3.5 w-3.5" />
                  {isUpdatingBasicInfo ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="divide-y divide-border/40 grid gap-2">
              <InfoRow label="Prospect ID" value={prospect.prospectNo} />
              <InfoRow label="Lead Title" required />
              <InfoRow
                label="First Name"
                value={prospect.lead?.firstName}
                required
              />
              <InfoRow
                label="Last Name"
                value={prospect.lead?.lastName}
                required
              />
              <InfoRow
                label="Company Name"
                value={prospect.lead?.companyName}
                required
              />
              <InfoRow
                label="Email Address"
                value={prospect.lead?.email}
                required
              />
              <InfoRow
                label="Mobile No"
                value={prospect.lead?.mobile}
                required
              />
              <InfoRow
                label="Alternate Mobile No"
                value={prospect.lead?.alternateMobile}
              />
              <InfoRow label="Website" value={prospect.lead?.website} link />
              <InfoRow
                label="LinkedIn Profile"
                value={prospect.lead?.linkedInProfile}
                link
              />
              <InfoRow label="Lead Source" value={prospect.lead?.source} />
              <InfoRow label="Industry" value={prospect.lead?.industry} />
              <InfoRow
                label="Address"
                value={formatLeadAddress(prospect.lead)}
              />
              <InfoRow
                label="Product Interested"
                value={
                  prospect.lead?.productInterest?.name ??
                  prospect.lead?.productInterested
                }
                required
              />
              <InfoRow
                label="Assign"
                value={
                  prospect.assignedTo
                    ? `${prospect.assignedTo.firstName} ${prospect.assignedTo.lastName}`
                    : null
                }
                required
              />
              <InfoRow
                label="Requirement Description"
                value={prospect.lead?.requiredDescription ?? prospect.notes}
              />
            </div>
          )}
        </Card>

        {/* ── RIGHT: Tabbed panel ── */}
        <Card className="overflow-y-auto border-border/60 bg-card py-0 shadow-sm">
          <div className="sticky top-0 z-10 flex border-b border-border/40 bg-card">
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 border-b-2 px-4 py-3 text-sm transition-colors ${
                activeTab === "timeline"
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Activity Timeline
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("followup")}
              className={`flex-1 border-b-2 px-4 py-3 text-sm transition-colors ${
                activeTab === "followup"
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Follow up
            </button>
          </div>

          {activeTab === "timeline" ? (
            <div className="px-4 py-4">
              {prospect.activities && prospect.activities.length > 0 ? (
                <div className="flex flex-col">
                  {prospect.activities.map((activity, index) => {
                    const isLast = index === prospect.activities!.length - 1;
                    const icon =
                      activity.type === "EMAIL" ? (
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : activity.type === "CALL" ? (
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : activity.type === "MEETING" ? (
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : activity.type === "QUOTATION_CREATED" ||
                        activity.type === "QUOTATION_UPDATED" ? (
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                      );

                    const typeLabel: Record<string, string> = {
                      CALL: "Call",
                      EMAIL: "Email",
                      MEETING: "Meeting",
                      CONVERSION: "Converted from lead",
                      STAGE_CHANGE: "Stage changed",
                      FOLLOW_UP_SET: "Follow-up set",
                      NOTE: "Note",
                      QUOTATION_CREATED: "Quotation Created",
                      QUOTATION_UPDATED: "Quotation Updated",
                    };

                    return (
                      <div key={activity.id} className="flex gap-3 ">
                        <div className="flex flex-col items-center">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                            {icon}
                          </div>

                          {!isLast && (
                            <div className="mt-1 w-px flex-1 bg-border" />
                          )}
                        </div>

                        <div className={`flex-1 ${isLast ? "" : "pb-5"} `}>
                          <p className="mb-1 text-xs font-semibold text-foreground">
                            {typeLabel[activity.type] ?? activity.type}
                          </p>

                          {activity.createdAt && (
                            <div className="mb-2 flex flex-wrap gap-2 ">
                              <span className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs text-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(activity.createdAt)}
                              </span>

                              <span className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs text-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(
                                  activity.createdAt,
                                ).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                          )}

                          {activity.summary && (
                            <div
                              className={`rounded-lg border p-3 text-xs leading-relaxed ${
                                activity.followUpHealth === "OVERDUE"
                                  ? "border-red-300 bg-red-50 text-red-700"
                                  : activity.followUpHealth === "WARNING"
                                    ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                                    : "bg-muted text-foreground"
                              }`}
                            >
                              {activity?.metadata?.outcome
                                ? activity.metadata.outcome
                                : activity.summary}

                              {activity.followUpHealth === "OVERDUE" && (
                                <div className="mt-2 text-[10px] font-semibold uppercase">
                                  Overdue
                                </div>
                              )}

                              {activity.followUpHealth === "WARNING" && (
                                <div className="mt-2 text-[10px] font-semibold uppercase">
                                  Warning
                                </div>
                              )}
                            </div>
                          )}

                          {activity.type === "QUOTATION_CREATED" ||
                          activity.type === "QUOTATION_UPDATED" ? (
                            activity.metadata?.quotationId ? (
                              <div className="mt-2">
                                <Link
                                  to={scopedPath(`/quotations/${activity.metadata.quotationId}`)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  View Quotation Details (
                                  {activity.metadata.refNo || "View"})
                                </Link>
                              </div>
                            ) : (
                              activity.details && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {activity.details}
                                </p>
                              )
                            )
                          ) : (
                            activity.details && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                {activity.details}
                              </p>
                            )
                          )}

                          <div className="flex justify-between">
                            {activity.createdBy && (
                              <p className="mt-2 text-xs font-medium text-foreground">
                                Created By : {activity.createdBy.firstName}{" "}
                                {activity.createdBy.lastName}
                              </p>
                            )}

                            {activity?.metadata?.attendees && (
                              <p className="mt-2 text-xs font-medium text-foreground">
                                attendees : {activity?.metadata?.attendees}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/50 bg-muted/5 px-4 py-8 text-center text-sm text-muted-foreground">
                  No activity logged yet.
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "followup" ? (
            <div className="px-4 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/20 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {prospect.followUp?.date
                      ? formatDate(prospect.followUp.date)
                      : "Not set"}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/20 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium text-foreground">
                    {prospect.followUp?.time || "Not set"}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/20 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium text-foreground">
                    {getOptionLabel(
                      prospectFollowUpTypeOptions,
                      prospect.followUp?.type,
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/20 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Assignee</p>
                  <p className="text-sm font-medium text-foreground">
                    {prospect.followUp?.assignedTo
                      ? `${prospect.followUp.assignedTo.firstName} ${prospect.followUp.assignedTo.lastName}`
                      : prospect.assignedTo
                        ? `${prospect.assignedTo.firstName} ${prospect.assignedTo.lastName}`
                        : "Unassigned"}
                  </p>
                </div>
              </div>

              {prospect.followUp?.notes ? (
                <div className="rounded-lg bg-muted/20 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                  {prospect.followUp.notes}
                </div>
              ) : null}

              {prospect.isEditable && !prospect.isTerminal ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setFollowUpDialogOpen(true)}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {prospect.followUp?.date
                    ? "Reschedule Follow-up"
                    : "Schedule Follow-up"}
                </Button>
              ) : null}

              <div className="border-t border-border/40" />

              {prospect.isEditable ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Log activity
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        activityForm.setValue("type", "CALL");
                        setActivityDialogOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-card px-2 py-3 text-xs text-muted-foreground hover:border-border/70 hover:text-foreground transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      Log call
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        activityForm.setValue("type", "MEETING");
                        setActivityDialogOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-card px-2 py-3 text-xs text-muted-foreground hover:border-border/70 hover:text-foreground transition-colors"
                    >
                      <Users className="h-4 w-4" />
                      Log meeting
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailDialogOpen(true)}
                      disabled={!canLaunchEmail}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-card px-2 py-3 text-xs text-muted-foreground hover:border-border/70 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Mail className="h-4 w-4" />
                      Log email
                    </button>
                  </div>
                </div>
              ) : null}

              {/* {prospect.isEditable ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Stage
                    </p>
                    <StatusBadge
                      status={prospect.stage}
                      label={PROSPECT_STAGE_LABELS[prospect.stage]}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setStageDialogOpen(true)}
                  >
                    Change Stage
                  </Button>
                </div>
              ) : null} */}
            </div>
          ) : null}
        </Card>
      </div>

      {/* ── Dialogs ── */}

      {/* Log activity */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Log Activity</DialogTitle>
            <DialogDescription>
              Record a call or meeting for this prospect.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col" onSubmit={handleActivitySubmit}>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Activity Type" required>
                  <Controller
                    name="type"
                    control={activityForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        onOpenChange={(open) => {
                          if (!open) field.onBlur();
                        }}
                        options={prospectActivityTypeOptions.filter(
                          (o) => o.value !== "EMAIL",
                        )}
                      />
                    )}
                  />
                </FormField>

                <FormField label="Occurred At" required>
                  <Input
                    {...activityForm.register("occurredAt")}
                    type="datetime-local"
                  />
                </FormField>

                <FormField
                  label="Title"
                  required
                  className="col-span-2"
                  error={activityForm.formState.errors.title?.message}
                >
                  <Input
                    {...activityForm.register("title", {
                      required: "Title is required",
                    })}
                    placeholder="Discovery call completed"
                  />
                </FormField>

                <FormField label="Outcome" className="col-span-2">
                  <Input
                    {...activityForm.register("outcome")}
                    placeholder="Interested in proposal"
                  />
                </FormField>

                {selectedActivityType === "CALL" ? (
                  <FormField label="Duration (minutes)">
                    <Input
                      {...activityForm.register("durationMinutes")}
                      type="number"
                      min="0"
                    />
                  </FormField>
                ) : null}

                {selectedActivityType === "MEETING" ? (
                  <FormField label="Attendees">
                    <Input
                      {...activityForm.register("attendees")}
                      placeholder="CEO, Sales Head"
                    />
                  </FormField>
                ) : null}
              </div>

              <FormField label="Notes" className="mt-5">
                <textarea
                  {...activityForm.register("notes")}
                  rows={3}
                  className={textareaClassName}
                  placeholder="Key discussion points"
                />
              </FormField>
            </div>

            <DialogFooter className="border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActivityDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isCreatingActivity}>
                <Save className="h-4 w-4" />
                {isCreatingActivity ? "Logging..." : "Log Activity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Email */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Log Email</DialogTitle>
            <DialogDescription>
              No outbound email is sent — this just records the activity.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5 px-6 py-5" onSubmit={handleEmailSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email Address" required>
                <Input value={prospect.lead?.email ?? ""} disabled />
              </FormField>
              <FormField label="Logged At" required>
                <Input
                  {...emailForm.register("occurredAt")}
                  type="datetime-local"
                />
              </FormField>
              <FormField
                label="Subject"
                required
                className="col-span-2"
                error={emailForm.formState.errors.title?.message}
              >
                <Input
                  {...emailForm.register("title", {
                    required: "Subject is required",
                  })}
                />
              </FormField>
              <FormField label="Outcome" className="col-span-2">
                <Input
                  {...emailForm.register("outcome")}
                  placeholder="Proposal follow-up sent"
                />
              </FormField>
            </div>
            <FormField label="Body Preview / Notes">
              <textarea
                {...emailForm.register("notes")}
                rows={4}
                className={textareaClassName}
                placeholder="Draft summary or key intent of the email"
              />
            </FormField>
            <DialogFooter className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingActivity}>
                <Mail className="h-4 w-4" />
                {isCreatingActivity ? "Saving..." : "Save Email Activity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stage change */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Change Stage</DialogTitle>
            <DialogDescription>
              Select a new stage and provide a mandatory comment.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5 px-6 py-5" onSubmit={handleStageSubmit}>
            <FormField label="New Stage" required>
              <Controller
                name="stage"
                control={stageForm.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    onOpenChange={(open) => {
                      if (!open) field.onBlur();
                    }}
                    options={prospectStageOptions}
                  />
                )}
              />
            </FormField>
            {hasPendingStageChange ? (
              <FormField
                label="Comment"
                required
                error={stageForm.formState.errors.comment?.message}
              >
                <textarea
                  {...stageForm.register("comment")}
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
            <DialogFooter className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStageDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!hasPendingStageChange || isUpdatingStage}
              >
                <Save className="h-4 w-4" />
                {isUpdatingStage ? "Updating..." : "Update Stage"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule follow-up */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>
              Set the next planned touchpoint for this prospect.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5 px-6 py-5" onSubmit={handleFollowUpSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Next Follow-up Date"
                required
                error={followUpForm.formState.errors.date?.message}
              >
                <Input {...followUpForm.register("date")} type="date" />
              </FormField>
              <FormField label="Time">
                <Input {...followUpForm.register("time")} type="time" />
              </FormField>
              <FormField
                label="Follow-up Type"
                required
                error={followUpForm.formState.errors.type?.message}
              >
                <Controller
                  name="type"
                  control={followUpForm.control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      onOpenChange={(open) => {
                        if (!open) field.onBlur();
                      }}
                      options={prospectFollowUpTypeOptions}
                    />
                  )}
                />
              </FormField>
              <FormField label="Reminder">
                <Controller
                  name="reminder"
                  control={followUpForm.control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      onOpenChange={(open) => {
                        if (!open) field.onBlur();
                      }}
                      options={[
                        { value: "", label: "No reminder" },
                        ...prospectReminderOptions,
                      ]}
                    />
                  )}
                />
              </FormField>
              {/* <FormField label="Assigned To" className="col-span-2">
                <Controller
                  name="assignedToId"
                  control={followUpForm.control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      onOpenChange={(open) => {
                        if (!open) field.onBlur();
                      }}
                      options={assigneeOptions}
                    />
                  )}
                />
              </FormField> */}
            </div>
            <FormField label="Notes">
              <textarea
                {...followUpForm.register("notes")}
                rows={3}
                className={textareaClassName}
                placeholder="Next step, pending ask, or meeting context"
              />
            </FormField>
            <DialogFooter className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFollowUpDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingFollowUp}>
                <Save className="h-4 w-4" />
                {isUpdatingFollowUp ? "Saving..." : "Save Follow-up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProspectFormContainer;
