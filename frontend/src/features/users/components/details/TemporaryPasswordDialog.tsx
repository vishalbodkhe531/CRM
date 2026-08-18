import { useState } from "react";
import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DialogShell from "@/components/common/DialogShell";
import { toast } from "@/utils/toast";

interface TemporaryPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  temporaryPassword: string;
}

/**
 * One-time reveal of a generated temporary password.
 *
 * The value is never stored anywhere — once this dialog closes it is gone, so
 * the copy affordance and the warning both matter.
 */
const TemporaryPasswordDialog = ({
  open,
  onOpenChange,
  userName,
  temporaryPassword,
}: TemporaryPasswordDialogProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      toast.success("Password copied to clipboard");
    } catch {
      // Clipboard access can be blocked (insecure origin, permissions policy).
      // The value is visible and selectable, so this is recoverable.
      toast.error("Could not copy — select the password and copy it manually");
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setCopied(false);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogShell
        title="Temporary Password"
        description={`${userName} has been signed out of all sessions and must use this password to sign in.`}
        size="confirm"
        leadingIcon={
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
        }
        footer={
          <Button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="h-10 rounded-full px-8"
          >
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-100/60 p-3 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">
              This password is shown only once and cannot be retrieved later.
              Copy it now and share it through a secure channel.
            </p>
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="temporary-password"
            >
              Temporary password
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="temporary-password"
                value={temporaryPassword}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                className="h-10 rounded-2xl font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label="Copy temporary password"
                className="h-10 w-10 shrink-0 rounded-2xl"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ask the user to change it immediately after signing in.
            </p>
          </div>
        </div>
      </DialogShell>
    </Dialog>
  );
};

export default TemporaryPasswordDialog;
