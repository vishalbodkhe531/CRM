import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { FilterConfigItem, FilterState } from "@/types/filter.types";

interface FilterFieldProps {
  item: FilterConfigItem;
  value: FilterState[string];
  onValueChange: (name: string, value: string | string[] | undefined) => void;
  onToggleCheckbox: (name: string, value: string) => void;
}

const FilterField: React.FC<FilterFieldProps> = ({
  item,
  value,
  onValueChange,
}) => {
  switch (item.type) {
    case "checkbox-group":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground/80 lowercase first-letter:uppercase">
            {item.label}
          </h4>
          <div className="grid grid-cols-1 gap-y-2.5">
            {item.options?.map((option) => {
              const selectedValues = Array.isArray(value) ? value : [];
              const isSelected = selectedValues.includes(option.value);

              return (
                <div key={option.value} className="flex items-center gap-3">
                  <Checkbox
                    id={`filter-${item.name}-${option.value}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const nextValue =
                        checked === true
                          ? Array.from(
                              new Set([...selectedValues, option.value]),
                            )
                          : selectedValues.filter(
                              (entry) => entry !== option.value,
                            );

                      onValueChange(
                        item.name,
                        nextValue.length > 0 ? nextValue : undefined,
                      );
                    }}
                  />
                  <Label
                    htmlFor={`filter-${item.name}-${option.value}`}
                    className="text-sm font-medium leading-none cursor-pointer hover:text-primary transition-colors"
                  >
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "select":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground/80 lowercase first-letter:uppercase">
            {item.label}
          </h4>
          <Select
            name={item.name}
            value={typeof value === "string" ? value : ""}
            onValueChange={(nextValue) =>
              onValueChange(item.name, nextValue === "" ? undefined : nextValue)
            }
            clearOnReselect
            options={[{ label: "All", value: "" }, ...(item.options ?? [])]}
          />
        </div>
      );

    case "text":
    case "date-range":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground/80 lowercase first-letter:uppercase">
            {item.label}
          </h4>
          <Input
            type={
              item.inputType ?? (item.type === "date-range" ? "date" : "text")
            }
            value={typeof value === "string" ? value : ""}
            placeholder={item.placeholder}
            onChange={(event) =>
              onValueChange(
                item.name,
                event.target.value.trim() === ""
                  ? undefined
                  : event.target.value,
              )
            }
            className="h-10 rounded-2xl"
          />
        </div>
      );

    default:
      return null;
  }
};

export default FilterField;
