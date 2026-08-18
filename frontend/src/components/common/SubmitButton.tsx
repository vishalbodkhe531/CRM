import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import React from "react";

interface SubmitButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  "type"
> {
  loading?: boolean;
  mode?: "create" | "edit";
  createText?: string;
  updateText?: string;
  loadingText?: string;
}

const SubmitButton = ({
  loading = false,
  mode = "create",
  createText = "Create",
  updateText = "Update",
  loadingText = "Saving...",
  className = "",
  disabled,
  ...props
}: SubmitButtonProps) => {
  const buttonText = loading
    ? loadingText
    : mode === "create"
      ? createText
      : updateText;

  return (
    <Button
      type="submit"
      disabled={loading || disabled}
      className={cn("h-10 px-8", className)}
      {...props}
    >
      {buttonText}
    </Button>
  );
};

export default SubmitButton;
