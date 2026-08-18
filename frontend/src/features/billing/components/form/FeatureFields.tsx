import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";
import type { PlanFeatureValue } from "@/contracts/types";

/**
 * Shared editor for a list of feature values.
 *
 * Used by BOTH the plan form and the per-organization override form. The only
 * difference is `overrideMode`, which adds a checkbox per row: an override row
 * that is unchecked is simply not sent, and the organization falls back to the
 * plan.
 *
 * The catalogue itself comes from the server (label, description, kind,
 * enforced) so this component never keeps a second copy of it to drift.
 */

interface FeatureFieldsProps {
  /** Feature metadata in catalogue order. */
  catalogue: PlanFeatureValue[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors?: FieldErrors<any>;
  /** Adds the per-row "override this" checkbox and note field. */
  overrideMode?: boolean;
  disabled?: boolean;
}

const FeatureFields = ({
  catalogue,
  control,
  errors,
  overrideMode = false,
  disabled = false,
}: FeatureFieldsProps) => {
  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {catalogue.map((feature, index) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rowErrors = (errors?.features as any)?.[index];

        return (
          <div key={feature.key} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {feature.label}
                  </p>
                  {/*
                    Honest labelling: most limits are reported but not refused.
                    Showing that here stops anyone selling a decorative limit.
                  */}
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      feature.enforced
                        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {feature.enforced ? "Enforced" : "Reported only"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {overrideMode && (
                  <Controller
                    control={control}
                    name={`features.${index}.enabled`}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`override-${feature.key}`}
                          checked={Boolean(field.value)}
                          disabled={disabled}
                          onCheckedChange={field.onChange}
                        />
                        <Label
                          htmlFor={`override-${feature.key}`}
                          className="cursor-pointer text-xs font-medium"
                        >
                          Custom
                        </Label>
                      </div>
                    )}
                  />
                )}

                {feature.kind === "toggle" ? (
                  <Controller
                    control={control}
                    name={`features.${index}.toggleValue`}
                    render={({ field }) => (
                      <Switch
                        checked={Boolean(field.value)}
                        disabled={disabled}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                ) : (
                  <Controller
                    control={control}
                    name={`features.${index}.limitValue`}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        inputMode="numeric"
                        disabled={disabled}
                        placeholder="Unlimited"
                        className="h-9 w-32 text-right"
                      />
                    )}
                  />
                )}
              </div>
            </div>

            {feature.kind === "limit" && (
              <p className="text-[11px] text-muted-foreground">
                Leave blank for unlimited.
              </p>
            )}

            {rowErrors?.limitValue?.message && (
              <p className="text-xs font-medium text-destructive">
                {String(rowErrors.limitValue.message)}
              </p>
            )}

            {overrideMode && (
              <Controller
                control={control}
                name={`features.${index}.note`}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    disabled={disabled}
                    placeholder="Why does this customer have different terms?"
                    className="h-9 text-xs"
                  />
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FeatureFields;
