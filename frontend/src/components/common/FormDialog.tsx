import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  submitLoadingLabel?: string;
  cancelLabel?: string;
  contentClassName?: string;
}

const FormDialog = ({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save",
  submitLoadingLabel = "Saving...",
  cancelLabel = "Cancel",
  contentClassName = "max-w-3xl",
}: FormDialogProps) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          "rounded-2xl p-0 border-0 shadow-2xl bg-card overflow-hidden",
          contentClassName,
        )}
      >
        <DialogHeader className="p-6 sm:p-8 pb-4 sm:pb-4 border-b border-border bg-card/30">
          <DialogTitle className="text-2xl font-bold text-foreground">
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {children}
          </div>

          <DialogFooter className="gap-4 p-6 sm:p-8 pt-4 sm:pt-4 border-t border-border bg-card/30">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="rounded-full h-11 px-8 font-semibold border-border bg-transparent hover:bg-secondary/50 text-foreground"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full h-11 px-8 font-semibold bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm"
            >
              {isSubmitting ? submitLoadingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormDialog;
