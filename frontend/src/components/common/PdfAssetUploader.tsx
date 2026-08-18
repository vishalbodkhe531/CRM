import type { ChangeEventHandler } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface PdfAssetUploaderProps {
  id: string;
  label: string;
  icon: LucideIcon;
  previewUrl?: string | null;
  previewClassName?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  isUploading?: boolean;
  compact?: boolean;
}

const PdfAssetUploader = ({
  id,
  label,
  icon: Icon,
  previewUrl,
  previewClassName,
  onChange,
  disabled,
  isUploading,
  compact,
}: PdfAssetUploaderProps) => {
  const buttonLabel = isUploading ? "Saving..." : previewUrl ? "Replace" : "Upload";

  if (compact) {
    return (
      <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-3 shadow-sm transition-colors hover:border-primary/50">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
            {previewUrl ? (
              <img src={previewUrl} alt={label} className={previewClassName} />
            ) : (
              <Icon className="h-4 w-4" />
            )}
          </span>
          <span className="truncate text-xs font-semibold text-foreground">
            {label}
          </span>
        </div>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={onChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => document.getElementById(id)?.click()}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {buttonLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <div className="mb-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
        {previewUrl ? (
          <img src={previewUrl} alt={label} className={previewClassName} />
        ) : (
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        )}
      </div>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className={cn("w-full", isUploading && "cursor-wait")}
        onClick={() => document.getElementById(id)?.click()}
      >
        <Upload className="h-4 w-4" />
        {buttonLabel}
      </Button>
    </div>
  );
};

export default PdfAssetUploader;
