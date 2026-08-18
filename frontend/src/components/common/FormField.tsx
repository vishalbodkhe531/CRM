import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

interface FormFieldProps {
  label: string;
  error?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  layout?: "vertical" | "horizontal";
  id?: string;
}

const FormField = ({
  label,
  error,
  description,
  children,
  className,
  required,
  layout = "vertical",
  id,
}: FormFieldProps) => {
  const isHorizontal = layout === "horizontal";
  const generatedId = useId();
  const fieldId = id ?? `field-${generatedId}`;
  const childId = isValidElement(children)
    ? (children.props as { id?: string }).id
    : undefined;
  const controlId = childId ?? fieldId;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  const enhancedChildren =
    isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id: controlId,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
        })
      : children;

  return (
    <div
      className={cn(
        "flex gap-1",
        isHorizontal
          ? "flex-col sm:flex-row sm:items-center sm:gap-2"
          : "flex-col",
        className,
      )}
    >
      <Label
        htmlFor={controlId}
        className={cn(
          "flex shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground/80",
          isHorizontal && "sm:w-64 sm:justify-start",
        )}
      >
        {label}
        {required && (
          <span className="text-destructive ml-1 text-lg font-bold">*</span>
        )}
      </Label>
      <div className="relative flex-1 min-w-0">
        {enhancedChildren}
        {description && (
          <p
            id={descriptionId}
            className="mt-1 text-xs text-muted-foreground break-words [overflow-wrap:anywhere]"
          >
            {description}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            className="mt-1 text-xs font-medium leading-snug text-destructive break-words [overflow-wrap:anywhere] animate-in fade-in slide-in-from-top-1"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default FormField;
