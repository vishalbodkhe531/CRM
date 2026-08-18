import type { FC } from "react";
import { Controller } from "react-hook-form";
import {
  useItemForm,
  itemTypeOptions,
  gstRateOptions,
  isItemTypeValue,
  parseGstRateValue,
} from "../../hooks/useItemForm";
import FormField from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Item } from "../../types";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

interface ItemEditFormProps {
  item?: Item;
  isAdding?: boolean;
}

const ItemEditForm: FC<ItemEditFormProps> = ({ item, isAdding }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const { form, register, handleSubmit, errors, actionLoading, isEdit } =
    useItemForm({ item, isAdding });
  const itemType = form.watch("itemType");
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
          <div className="min-w-0">
            <FormField
              label="Item Type"
              error={errors.itemType?.message}
            >
              <Controller
                name="itemType"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (isItemTypeValue(value)) {
                        field.onChange(value);
                      }
                    }}
                    onOpenChange={(open) => {
                      if (!open) {
                        field.onBlur();
                      }
                    }}
                    options={itemTypeOptions}
                    placeholder="Select item type"
                  />
                )}
              />
            </FormField>
          </div>

          <div className="min-w-0">
            <FormField
              label="Item Name"
              required
              error={errors.name?.message}
            >
              <Input placeholder="Enter item name, e.g. Steel Rod" {...register("name")} />
            </FormField>
          </div>

          <div className="min-w-0">
            <FormField
              label="Item Code (SKU)"
              error={errors.itemCode?.message}
            >
              <Input
                placeholder="Enter SKU, e.g. ITEM-001"
                {...register("itemCode")}
                readOnly={isEdit}
                className={isEdit ? "cursor-not-allowed opacity-60" : ""}
              />
            </FormField>
          </div>

          {itemType === "GOODS" ? (
            <div className="min-w-0">
              <FormField
                label="HSN Code"
                required
                error={errors.hsnCode?.message}
              >
                <Input placeholder="Enter HSN code, e.g. 7214" {...register("hsnCode")} />
              </FormField>
            </div>
          ) : (
            <div className="min-w-0">
              <FormField
                label="SAC Code"
                required
                error={errors.sacCode?.message}
              >
                <Input placeholder="Enter SAC code, e.g. 998315" {...register("sacCode")} />
              </FormField>
            </div>
          )}

          <div className="min-w-0">
            <FormField
              label="GST Rate (%)"
              error={errors.gstRate?.message}
            >
              <Controller
                name="gstRate"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => {
                      const nextRate = parseGstRateValue(value);
                      if (nextRate !== null) {
                        field.onChange(nextRate);
                      }
                    }}
                    onOpenChange={(open) => {
                      if (!open) {
                        field.onBlur();
                      }
                    }}
                    options={gstRateOptions}
                    placeholder="Select GST rate"
                  />
                )}
              />
            </FormField>
          </div>

          <div className="min-w-0">
            <FormField
              label="Price (₹)"
              required
              error={errors.price?.message}
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter price, e.g. 1500.00"
                {...register("price", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="min-w-0 md:col-span-2 lg:col-span-3">
            <FormField
              label="Description"
              error={errors.description?.message}
            >
              <textarea
                {...register("description")}
                placeholder="Add a short product or service description"
                rows={4}
                className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse items-stretch border-t border-border/30 pt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(scopedPath("/items"))}
          disabled={actionLoading}
          className="h-11 px-8 rounded-full border-border/50 bg-background hover:bg-accent/50 hover:text-accent-foreground transition-all font-bold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={actionLoading}
          className="h-11 px-10 rounded-full font-bold"
        >
          {actionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Saving..." : "Adding..."}
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Add Item"
          )}
        </Button>
      </div>
    </form>
  );
};

export default ItemEditForm;
