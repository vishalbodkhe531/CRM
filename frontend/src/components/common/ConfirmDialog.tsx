import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import DialogShell from "./DialogShell";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  variant?: "default" | "destructive";
  /**
   * When set, the user must type this exact phrase before confirming. Use for
   * irreversible or wide-blast-radius actions so they cannot be a single click.
   */
  confirmPhrase?: string;
  /** Label above the typed-confirmation input. */
  confirmPhraseLabel?: string;
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  loading = false,
  variant = "default",
  confirmPhrase,
  confirmPhraseLabel,
}: ConfirmDialogProps) => {
  const [typedPhrase, setTypedPhrase] = useState("");

  const phraseMatches =
    !confirmPhrase || typedPhrase.trim() === confirmPhrase.trim();
  const confirmDisabled = loading || !phraseMatches;

  // Clear on every close path — cancel, escape, overlay click, and a completed
  // confirm — so a previous confirmation can never pre-authorise the next one.
  const handleOpenChange = (next: boolean) => {
    if (!next) setTypedPhrase("");
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (!phraseMatches) return;
    await onConfirm();
    setTypedPhrase("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogShell
        title={title}
        description={description}
        size="confirm"
        leadingIcon={
          variant === "destructive" ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
          ) : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="h-10 rounded-[30px] px-6"
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={confirmDisabled}
              variant={variant === "destructive" ? "destructive" : "default"}
              className="h-10 min-w-[100px] rounded-[30px] px-8"
            >
              {loading ? "Processing..." : confirmText}
            </Button>
          </>
        }
      >
        {confirmPhrase ? (
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="confirm-phrase"
            >
              {confirmPhraseLabel ??
                `Type “${confirmPhrase}” to confirm`}
            </label>
            <Input
              id="confirm-phrase"
              value={typedPhrase}
              onChange={(event) => setTypedPhrase(event.target.value)}
              placeholder={confirmPhrase}
              autoComplete="off"
              disabled={loading}
              className="h-10 rounded-2xl"
            />
          </div>
        ) : null}
      </DialogShell>
    </Dialog>
  );
};

export default ConfirmDialog;
