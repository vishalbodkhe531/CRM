import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, XCircle } from "lucide-react";
import DialogShell from "@/components/common/DialogShell";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type {
  SignupRequest,
  SignupRequestStatusPayload,
} from "../../types";

interface SignupRequestDetailDialogProps {
  request: SignupRequest | null;
  open: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (
    request: SignupRequest,
    payload: SignupRequestStatusPayload,
  ) => void;
}

const detailRows = (request: SignupRequest) => [
  ["Name", `${request.firstName} ${request.lastName}`],
  ["Email", request.email],
  ["Phone", request.phone || "-"],
  ["Company", request.companyName],
  ["Submitted", new Date(request.createdAt).toLocaleString("en-IN")],
  [
    "Reviewed",
    request.reviewedAt
      ? new Date(request.reviewedAt).toLocaleString("en-IN")
      : "-",
  ],
  ["IP Address", request.ipAddress || "-"],
];

const SignupRequestDetailDialog = ({
  request,
  open,
  loading = false,
  onOpenChange,
  onUpdateStatus,
}: SignupRequestDetailDialogProps) => {
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    setAdminNotes(request?.adminNotes ?? "");
  }, [request]);

  if (!request) return null;

  const update = (status: SignupRequestStatusPayload["status"]) => {
    onUpdateStatus(request, {
      status,
      adminNotes: adminNotes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogShell
        title="Signup Request"
        description="Review contact details and update the request status"
        className="sm:max-w-2xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => update("CONTACTED")}
              className="h-10 rounded-full px-5"
            >
              <MessageCircle className="h-4 w-4" />
              Contacted
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => update("APPROVED")}
              className="h-10 rounded-full px-5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={() => update("REJECTED")}
              className="h-10 rounded-full px-5"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {request.companyName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {request.email}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          <dl className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2">
            {detailRows(request).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">
              Admin Notes
            </span>
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              maxLength={1000}
              rows={5}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Add internal context before updating the status"
            />
          </label>
        </div>
      </DialogShell>
    </Dialog>
  );
};

export default SignupRequestDetailDialog;
