import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TooltipLabel from "@/components/common/TooltipLabel";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Eye,
  FileText,
  MapPin,
  Plus,
  Save,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { STATE_OPTIONS, UNIT_OPTIONS } from "../../constants/seededParties";
import { useQuotationForm } from "../../hooks/useQuotationForm";
import { openQuotationPDFPreview } from "../../utils/pdfPreview";
import { useAppSelector } from "@/hooks/useRedux";
import { selectCurrentUser } from "@/features/auth";
import { useFeatureEnabled } from "@/features/billing";

import type { Quotation } from "../../types";

const openBase64File = (dataUrl: string, name: string) => {
  try {
    const parts = dataUrl.split(";base64,");
    if (parts.length < 2) return;
    const contentType = parts[0].split(":")[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([uInt8Array], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);

    const printWindow = window.open(blobUrl, "_blank");
    if (!printWindow) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = name;
      a.click();
    }
  } catch (err) {
    console.error("Failed to open file", err);
    toast.error("Failed to open file preview.");
  }
};

interface QuotationFormProps {
  onCancel: () => void;
  quotation?: Quotation;
  mode?: "view" | "create";
  hideHeaderIdentity?: boolean;
}

const QuotationForm = ({
  onCancel,
  quotation,
  mode = "create",
  hideHeaderIdentity = false,
}: QuotationFormProps) => {
  const isView = mode === "view";
  const currentUser = useAppSelector(selectCurrentUser);
  // QUOTATION_PDF is a plan toggle. Client-side render means this is the only
  // gate; permissive for roles that cannot read billing (see useFeatureEnabled).
  const canUsePdf = useFeatureEnabled("QUOTATION_PDF");
  const pdfOrganization =
    quotation?.organization || currentUser?.organization
      ? {
          ...(quotation?.organization ?? currentUser?.organization),
          companyLogo:
            currentUser?.organization?.companyLogo ??
            quotation?.organization?.companyLogo ??
            null,
          qrCode:
            currentUser?.organization?.qrCode ??
            quotation?.organization?.qrCode ??
            null,
          signature:
            currentUser?.organization?.signature ??
            quotation?.organization?.signature ??
            null,
        }
      : null;

  const [focusedPriceIdx, setFocusedPriceIdx] = useState<number | null>(null);
  const [priceInputValue, setPriceInputValue] = useState<string>("");

  const [focusedDiscountIdx, setFocusedDiscountIdx] = useState<number | null>(
    null,
  );
  const [discountInputValue, setDiscountInputValue] = useState<string>("");

  const [focusedRoundOff, setFocusedRoundOff] = useState<boolean>(false);
  const [roundOffInputValue, setRoundOffInputValue] = useState<string>("");

  const {
    itemsList,
    selectedPartyId,
    setSelectedPartyId,
    refNoPrefix,
    setRefNoPrefix,
    refNoSuffix,
    setRefNoSuffix,
    invoiceDate,
    setInvoiceDate,
    stateOfSupply,
    setStateOfSupply,
    gstCategory,
    setGstCategory,
    description,
    setDescription,
    termsAndConditionsList,
    addTermsAndConditions,
    updateTermsAndConditions,
    removeTermsAndConditions,
    images,
    addImage,
    removeImage,
    documents,
    addDocument,
    removeDocument,
    lineItems,
    addLineItem,
    removeLineItem,
    updateLineItem,
    updateLineItemDiscountAmount,
    tdsPercent,
    setTdsPercent,
    roundOff,
    setRoundOff,
    totals,
    errors,
    isSubmitting,
    handleSave,
    selectedParty,
    parties,
    isProspectsLoading,
  } = useQuotationForm(quotation);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      Array.from(files).forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(
            `File ${file.name} is too large. Max size allowed is 5MB.`,
          );
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            const sizeInMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";
            addImage(file.name, reader.result, sizeInMb);
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      Array.from(files).forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(
            `File ${file.name} is too large. Max size allowed is 5MB.`,
          );
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            const sizeInMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";
            addDocument(file.name, reader.result, sizeInMb);
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    }
  };

  // Map prospects for standard select options
  const partyOptions = [
    {
      value: "",
      label: isProspectsLoading ? "Loading parties..." : "Select",
    },
    ...parties.map((party) => ({
      value: party.id,
      label: party.name,
    })),
  ];

  // Map items for the table dropdown options
  const itemOptions = [
    { value: "", label: "Select Item" },
    ...itemsList.map((item) => ({
      value: item.id,
      label: item.name,
    })),
  ];

  // Map GST Tax Options dynamically based on manual gstCategory
  const taxPrefix = gstCategory === "EXEMPTED" ? "EXEMPTED" : gstCategory;
  const taxRates = ["0", "0.25", "3", "5", "12", "18", "28", "40"];
  const taxOptions = taxRates.map((rate) => {
    if (rate === "0") {
      return { value: "0", label: "EXEMPTED (0%)" };
    }
    if (gstCategory === "EXEMPTED") {
      return { value: rate, label: `EXEMPTED (${rate}%)` };
    }
    return { value: rate, label: `${taxPrefix} ${rate}%` };
  });

  // TDS Options
  const tdsOptions = [
    { value: "0", label: "None" },
    { value: "1", label: "TDS @ 1%" },
    { value: "2", label: "TDS @ 2%" },
    { value: "5", label: "TDS @ 5%" },
    { value: "10", label: "TDS @ 10%" },
  ];

  const handlePlaceholderAction = (actionName: string) => {
    toast.info(`${actionName} feature is coming soon!`);
  };
 
  return (
    // <div className="flex w-full flex-col h-full space-y-4">
    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border py-6 shadow-sm w-full h-full px-2">
      {/* Top Header Actions */}
      <div
        className={`flex flex-col md:flex-row md:items-center gap-4 border-b border-border/40 pb-4 ${
          hideHeaderIdentity ? "md:justify-end" : "justify-between"
        }`}
      >
        {!hideHeaderIdentity && (
          <div className="flex items-center gap-3">
            <TooltipLabel label="Back to quotations">
              <Button
                variant="outline"
                size="icon"
                onClick={onCancel}
                className="h-10 w-10 rounded-full border-border/50 bg-card hover:bg-muted"
                aria-label="Back to quotations"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </TooltipLabel>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Estimate / Quotation
              </h1>
              <p className="text-xs text-muted-foreground">
                Create and manage your quotations
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {canUsePdf && (
          <TooltipLabel label="Preview quotation PDF">
            <Button
              variant="outline"
              onClick={async () =>
                await openQuotationPDFPreview({
                  partyName: selectedParty?.name || "",
                  contactPerson: selectedParty?.contactPerson || "",
                  refNo: `${refNoPrefix} ${refNoSuffix}`,
                  date: invoiceDate,
                  stateOfSupply: stateOfSupply,
                  lineItems: lineItems,
                  totals: totals,
                  roundOff: roundOff,
                  tdsPercent: tdsPercent,
                  description: description,
                  termsAndConditions: termsAndConditionsList,
                  gstCategory: gstCategory,
                  partyAddress: selectedParty?.address,
                  partyPostalCode: selectedParty?.postalCode,
                  partyGstin: selectedParty?.gstin,
                  organization: pdfOrganization,
                })
              }
              className="h-10 rounded-full border-border bg-card text-foreground px-5 text-sm font-semibold flex items-center gap-2"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              Preview PDF
            </Button>
          </TooltipLabel>
          )}
          {/* <Button
            variant="outline"
            onClick={() => handleSave(true)}
            className="h-10 rounded-full border-border bg-card hover:bg-muted text-foreground px-5 text-sm font-semibold flex items-center gap-2"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            Save Draft
          </Button> */}
          {!isView && (
            <TooltipLabel label="Save this quotation">
              <Button
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                className="h-10 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground px-6 text-sm font-bold flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save quotation"}
              </Button>
            </TooltipLabel>
          )}
        </div>
      </div>

      {/* Main Form Fields Panel */}
      <Card className="border-border/60 bg-card shadow-sm p-6 rounded-2xl space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Party Selector Left Column */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                Prospects <span className="text-destructive font-bold">*</span>
              </label>
              <div className="mt-1.5">
                <Select
                  value={selectedPartyId}
                  onValueChange={setSelectedPartyId}
                  options={partyOptions}
                  disabled={isView}
                  className={
                    errors.partyId
                      ? "border-destructive focus-visible:ring-destructive/20"
                      : ""
                  }
                />
                {errors.partyId && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.partyId}
                  </p>
                )}
              </div>
            </div>

            {/* Selected Party Summary Card */}
            {selectedParty ? (
              <div className="flex items-start gap-4 p-4 rounded-xl border border-border/80 bg-background/50 animate-in fade-in duration-200">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">
                    {selectedParty.name}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Address:</strong> {selectedParty.address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Postal Code:</strong> {selectedParty.postalCode}
                  </p>
                  {selectedParty.gstin && (
                    <p className="text-xs text-muted-foreground">
                      <strong>GSTIN:</strong> {selectedParty.gstin}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 rounded-xl border border-dashed border-border bg-background/30">
                <p className="text-xs text-muted-foreground">
                  Please select a party client to view billing details
                </p>
              </div>
            )}
          </div>

          {/* Reference & Metadata Right Column */}
          <div className="space-y-4">
            {/* Ref No. Row */}
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-semibold text-foreground col-span-1">
                Ref No.
              </label>
              <div className="col-span-2">
                <div className="grid grid-cols-5 gap-2">
                  <Input
                    value={refNoPrefix}
                    onChange={(e) => setRefNoPrefix(e.target.value)}
                    disabled={isView}
                    aria-invalid={!!errors.refNoPrefix}
                    className="col-span-3 h-10 text-xs font-semibold"
                    placeholder="Prefix"
                  />
                  <Input
                    type="number"
                    value={refNoSuffix}
                    onChange={(e) => setRefNoSuffix(e.target.value)}
                    disabled={isView}
                    aria-invalid={!!errors.refNoSuffix}
                    className="col-span-2 h-10 text-xs font-semibold"
                    placeholder="Suffix"
                  />
                </div>
                {(errors.refNoPrefix || errors.refNoSuffix) && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.refNoPrefix || errors.refNoSuffix}
                  </p>
                )}
              </div>
            </div>

            {/* Invoice Date Row */}
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-semibold text-foreground col-span-1">
                Invoice Date
              </label>
              <div className="col-span-2">
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={isView}
                  aria-invalid={!!errors.invoiceDate}
                  className="h-10 text-xs font-semibold"
                />
                {errors.invoiceDate && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.invoiceDate}
                  </p>
                )}
              </div>
            </div>

            {/* State of Supply Row */}
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-semibold text-foreground col-span-1">
                State of Supply{" "}
                <span className="text-destructive font-bold">*</span>
              </label>
              <div className="col-span-2">
                <Select
                  value={stateOfSupply}
                  onValueChange={setStateOfSupply}
                  options={[
                    { value: "", label: "Select State" },
                    ...STATE_OPTIONS,
                  ]}
                  disabled={isView}
                  placeholder="Select State"
                  className={
                    errors.stateOfSupply
                      ? "border-destructive focus-visible:ring-destructive/20"
                      : ""
                  }
                />
                {errors.stateOfSupply && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.stateOfSupply}
                  </p>
                )}
              </div>
            </div>

            {/* GST Category Row */}
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-semibold text-foreground col-span-1 flex items-center gap-1">
                GST Category{" "}
                <span className="text-destructive font-bold">*</span>
              </label>
              <div className="col-span-2">
                <Select
                  value={gstCategory}
                  onValueChange={(value) =>
                    setGstCategory(value as typeof gstCategory)
                  }
                  options={[
                    { value: "GST", label: "GST" },
                    { value: "IGST", label: "IGST" },
                    { value: "EXEMPTED", label: "EXEMPTED" },
                  ]}
                  disabled={isView}
                  placeholder="Select GST Category"
                  className={
                    errors.gstCategory
                      ? "border-destructive focus-visible:ring-destructive/20"
                      : ""
                  }
                />
                {errors.gstCategory && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.gstCategory}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Item Table Card */}
      <div className="space-y-3">
        {!isView && (
          <div className="flex justify-end">
            <TooltipLabel label="Add quotation item">
              <Button
                type="button"
                onClick={addLineItem}
                className="h-9 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4.5 w-4.5" />
                Add New
              </Button>
            </TooltipLabel>
          </div>
        )}

        <div className="grid gap-3 xl:hidden">
          {lineItems.map((item, idx) => (
            <Card
              key={idx}
              className="gap-4 rounded-xl border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    Item #{idx + 1}
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-foreground">
                    {item.itemName || "Select an item"}
                  </p>
                </div>
                {!isView && (
                  <TooltipLabel label="Remove this item">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(idx)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label="Remove this item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipLabel>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Item
                  </label>
                  <Select
                    value={item.itemId}
                    onValueChange={(val) =>
                      updateLineItem(idx, { itemId: val })
                    }
                    options={itemOptions}
                    disabled={isView}
                    triggerClassName="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    HSN / SAC
                  </label>
                  <Input
                    value={item.code}
                    readOnly
                    className="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Unit
                  </label>
                  <Select
                    value={item.unit}
                    onValueChange={(val) => updateLineItem(idx, { unit: val })}
                    options={UNIT_OPTIONS}
                    disabled={isView}
                    triggerClassName="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(idx, {
                        quantity: Math.max(0, Number(e.target.value)),
                      })
                    }
                    disabled={isView}
                    className="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Price / Unit
                  </label>
                  <Input
                    type={focusedPriceIdx === idx ? "number" : "text"}
                    min={0}
                    value={
                      focusedPriceIdx === idx
                        ? priceInputValue
                        : item.price.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                    }
                    onFocus={() => {
                      setFocusedPriceIdx(idx);
                      setPriceInputValue(
                        item.price === 0 ? "" : item.price.toString(),
                      );
                    }}
                    onBlur={() => setFocusedPriceIdx(null)}
                    onChange={(e) => {
                      const numericVal = Number(e.target.value);
                      setPriceInputValue(e.target.value);
                      if (!isNaN(numericVal)) {
                        updateLineItem(idx, { price: Math.max(0, numericVal) });
                      }
                    }}
                    disabled={isView}
                    className="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Discount %
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={item.discountPercent.toFixed(2)}
                    onChange={(e) =>
                      updateLineItem(idx, {
                        discountPercent: Math.min(
                          100,
                          Math.max(0, Number(e.target.value)),
                        ),
                      })
                    }
                    disabled={isView}
                    className="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Discount Amount
                  </label>
                  <Input
                    type={focusedDiscountIdx === idx ? "number" : "text"}
                    min={0}
                    step="0.01"
                    value={
                      focusedDiscountIdx === idx
                        ? discountInputValue
                        : item.discountAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                    }
                    onFocus={() => {
                      setFocusedDiscountIdx(idx);
                      setDiscountInputValue(
                        item.discountAmount === 0
                          ? ""
                          : item.discountAmount.toString(),
                      );
                    }}
                    onBlur={() => setFocusedDiscountIdx(null)}
                    onChange={(e) => {
                      const numericVal = Number(e.target.value);
                      setDiscountInputValue(e.target.value);
                      if (!isNaN(numericVal)) {
                        updateLineItemDiscountAmount(
                          idx,
                          Math.max(0, numericVal),
                        );
                      }
                    }}
                    disabled={isView}
                    className="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Tax %
                  </label>
                  <Select
                    value={String(item.taxPercent)}
                    onValueChange={(val) =>
                      updateLineItem(idx, { taxPercent: Number(val) })
                    }
                    options={taxOptions}
                    disabled={isView}
                    triggerClassName="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Tax Amount
                  </label>
                  <Input
                    value={item.taxAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    readOnly
                    className="h-10 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-primary/15 px-3 py-2">
                <span className="text-sm font-semibold text-foreground">
                  Amount
                </span>
                <span className="text-sm font-black text-foreground">
                  Rs{" "}
                  {item.amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </Card>
          ))}
          <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">
                Total Qty
              </span>
              <span className="font-bold text-foreground">
                {totals.totalQty}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">
                Tax Total
              </span>
              <span className="font-bold text-foreground">
                Rs{" "}
                {totals.taxTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="hidden xl:block">
          {/* <Table className="min-w-[1500px]"> */}
          <Table className="table-fixed min-w-[1510px]">
            <TableHeader className="bg-primary-light/40 border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center text-xs font-bold uppercase text-foreground py-3">
                  Sr no
                </TableHead>
                <TableHead className="w-[280px] text-xs font-bold uppercase text-foreground py-3">
                  Item
                </TableHead>
                <TableHead className="w-[120px] text-xs font-bold uppercase text-foreground py-3">
                  HSN Code
                </TableHead>
                <TableHead className="w-[100px] text-xs font-bold uppercase text-foreground py-3">
                  Qty
                </TableHead>
                <TableHead className="w-[120px] text-xs font-bold uppercase text-foreground py-3">
                  Unit
                </TableHead>
                <TableHead className="w-[140px] text-xs font-bold uppercase text-foreground py-3">
                  Price / Unit
                </TableHead>
                <TableHead
                  className="text-center text-xs font-bold uppercase text-foreground py-3"
                  colSpan={2}
                >
                  Discount
                </TableHead>
                <TableHead
                  className="text-center text-xs font-bold uppercase text-foreground py-3"
                  colSpan={2}
                >
                  Tax
                </TableHead>
                <TableHead className="w-[130px] text-right text-xs font-bold uppercase text-foreground py-3">
                  Amount
                </TableHead>
                <TableHead className="w-10 text-center py-3"></TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent border-t border-border/40 text-[10px] text-muted-foreground uppercase bg-primary-light/10">
                <TableCell colSpan={6} className="py-1"></TableCell>
                <TableCell className="text-center py-1 font-bold border-l border-border/30 w-[90px]">
                  %
                </TableCell>
                <TableCell className="text-center py-1 font-bold border-r border-border/30 w-[120px]">
                  Amount
                </TableCell>
                <TableCell className="text-center py-1 font-bold border-l border-border/30 w-[160px]">
                  %
                </TableCell>
                <TableCell className="text-center py-1 font-bold border-r border-border/30 w-[120px]">
                  Amount
                </TableCell>
                <TableCell colSpan={2} className="py-1"></TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {lineItems.map((item, idx) => (
                <TableRow key={idx}>
                  {/* Sr No */}
                  <TableCell className="text-center">{idx + 1}</TableCell>

                  {/* Item */}
                  <TableCell>
                    <Select
                      value={item.itemId}
                      onValueChange={(val) =>
                        updateLineItem(idx, { itemId: val })
                      }
                      options={itemOptions}
                      disabled={isView}
                      triggerClassName="h-8 border-0 shadow-none bg-transparent text-sm"
                    />
                  </TableCell>

                  {/* HSN */}
                  <TableCell>
                    <Input
                      value={item.code}
                      readOnly
                      className="h-8 border-0 bg-transparent shadow-none text-center"
                    />
                  </TableCell>

                  {/* Qty */}
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(idx, {
                          quantity: Math.max(0, Number(e.target.value)),
                        })
                      }
                      disabled={isView}
                      className="h-8 border-0 shadow-none text-center"
                    />
                  </TableCell>

                  {/* Unit */}
                  <TableCell>
                    <Select
                      value={item.unit}
                      onValueChange={(val) =>
                        updateLineItem(idx, { unit: val })
                      }
                      options={UNIT_OPTIONS}
                      disabled={isView}
                      triggerClassName="h-8 border-0 shadow-none bg-transparent text-center"
                    />
                  </TableCell>

                  {/* Rate */}
                  <TableCell>
                    <Input
                      type={focusedPriceIdx === idx ? "number" : "text"}
                      min={0}
                      value={
                        focusedPriceIdx === idx
                          ? priceInputValue
                          : item.price.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                      }
                      onFocus={() => {
                        setFocusedPriceIdx(idx);
                        setPriceInputValue(
                          item.price === 0 ? "" : item.price.toString(),
                        );
                      }}
                      onBlur={() => {
                        setFocusedPriceIdx(null);
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPriceInputValue(val);
                        const numericVal = Number(val);
                        if (!isNaN(numericVal)) {
                          updateLineItem(idx, {
                            price: Math.max(0, numericVal),
                          });
                        }
                      }}
                      disabled={isView}
                      className="h-8 border-0 shadow-none text-right"
                    />
                  </TableCell>

                  {/* Discount % */}
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={item.discountPercent.toFixed(2)}
                      onChange={(e) =>
                        updateLineItem(idx, {
                          discountPercent: Math.min(
                            100,
                            Math.max(0, Number(e.target.value)),
                          ),
                        })
                      }
                      disabled={isView}
                      className="h-8 border-0 shadow-none text-center"
                    />
                  </TableCell>

                  {/* Discount Amount */}
                  <TableCell>
                    <Input
                      type={focusedDiscountIdx === idx ? "number" : "text"}
                      min={0}
                      step="0.01"
                      value={
                        focusedDiscountIdx === idx
                          ? discountInputValue
                          : item.discountAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                      }
                      onFocus={() => {
                        setFocusedDiscountIdx(idx);
                        setDiscountInputValue(
                          item.discountAmount === 0
                            ? ""
                            : item.discountAmount.toString(),
                        );
                      }}
                      onBlur={() => {
                        setFocusedDiscountIdx(null);
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDiscountInputValue(val);
                        const numericVal = Number(val);
                        if (!isNaN(numericVal)) {
                          updateLineItemDiscountAmount(
                            idx,
                            Math.max(0, numericVal),
                          );
                        }
                      }}
                      disabled={isView}
                      className="h-8 border-0 shadow-none text-right"
                    />
                  </TableCell>

                  {/* Tax % */}
                  <TableCell>
                    <Select
                      value={String(item.taxPercent)}
                      onValueChange={(val) =>
                        updateLineItem(idx, {
                          taxPercent: Number(val),
                        })
                      }
                      options={taxOptions}
                      disabled={isView}
                      triggerClassName="h-8 border-0 shadow-none bg-transparent text-center"
                    />
                  </TableCell>

                  {/* Tax Amount */}
                  <TableCell>
                    <Input
                      value={item.taxAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      readOnly
                      className="h-8 border-0 bg-transparent shadow-none text-right"
                    />
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="text-right font-semibold">
                    ₹
                    {item.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>

                  {/* Delete */}
                  <TableCell className="text-center">
                    {!isView && (
                      <TooltipLabel label="Remove this item">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(idx)}
                          className="h-7 w-7"
                          aria-label="Remove this item"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TooltipLabel>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Total Summary Row */}
              <TableRow className="bg-muted/10 font-bold border-t border-border border-double">
                <TableCell></TableCell>
                <TableCell className="text-foreground text-sm font-bold">
                  Total
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="text-left text-sm font-bold">
                  {totals.totalQty}
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell colSpan={2}></TableCell>
                <TableCell
                  colSpan={2}
                  className="text-center text-sm font-bold border-l border-r border-border/30"
                >
                  ₹
                  {totals.taxTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right text-sm font-bold text-foreground">
                  ₹
                  {lineItems
                    .reduce((acc, curr) => acc + curr.amount, 0)
                    .toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        {errors.items && (
          <p className="text-xs text-destructive font-semibold">
            {errors.items}
          </p>
        )}
      </div>

      {/* Bottom section (Notes/Attachments and Calculations Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border/60 bg-card p-5 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <TooltipLabel label="Add quotation terms">
                <Button
                  variant="outline"
                  type="button"
                  onClick={addTermsAndConditions}
                  disabled={isView}
                  className="h-9 rounded-full border-border bg-background hover:bg-muted text-xs font-semibold px-4 flex items-center gap-1.5"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Add Terms & Conditions
                </Button>
              </TooltipLabel>
              <TooltipLabel label="Attach image files">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() =>
                    document.getElementById("image-upload-input")?.click()
                  }
                  disabled={isView}
                  className="h-9 rounded-full border-border bg-background hover:bg-muted text-xs font-semibold px-4 flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  Add Image
                </Button>
              </TooltipLabel>
              <TooltipLabel label="Attach document files">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() =>
                    document.getElementById("document-upload-input")?.click()
                  }
                  disabled={isView}
                  className="h-9 rounded-full border-border bg-background hover:bg-muted text-xs font-semibold px-4 flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  Add Document
                </Button>
              </TooltipLabel>

              <input
                type="file"
                id="image-upload-input"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <input
                type="file"
                id="document-upload-input"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                multiple
                onChange={handleDocumentUpload}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground tracking-wide uppercase">
                Add Description
              </label>
              <div className="mt-1.5">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter Description"
                  rows={3}
                  disabled={isView}
                  className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-xs shadow-sm outline-none transition-all focus:border-primary focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {termsAndConditionsList.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-foreground tracking-wide uppercase">
                  Terms & Conditions
                </label>
                <div className="space-y-2.5">
                  {termsAndConditionsList.map((term, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <Input
                        value={term}
                        onChange={(e) =>
                          updateTermsAndConditions(index, e.target.value)
                        }
                        placeholder={`Term #${index + 1}`}
                        disabled={isView}
                        className="h-9 text-xs"
                      />
                      {!isView && (
                        <TooltipLabel label="Remove this term">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTermsAndConditions(index)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            aria-label="Remove this term"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipLabel>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-foreground tracking-wide uppercase">
                  Uploaded Images
                </label>
                <div className="flex flex-wrap gap-4">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group w-24 h-24 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center shadow-sm"
                    >
                      <img
                        src={img.data}
                        alt={img.name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => openBase64File(img.data, img.name)}
                      />
                      {!isView && (
                        <TooltipLabel label="Remove this image">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove this image"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipLabel>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documents.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-foreground tracking-wide uppercase">
                  Documents
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map((file, fileIdx) => (
                    <div
                      key={fileIdx}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all cursor-pointer"
                      onClick={() => openBase64File(file.data, file.name)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {file.size || "Unknown size"}
                          </p>
                        </div>
                      </div>
                      {!isView && (
                        <TooltipLabel label="Remove this document">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDocument(fileIdx);
                            }}
                            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full"
                            aria-label="Remove this document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipLabel>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-1">
          <Card className="border-border/60 bg-card p-5 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 text-xs">
              <span className="font-semibold text-muted-foreground">
                Subtotal
              </span>
              <span className="font-bold text-foreground">
                ₹
                {totals.subtotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border/40 pb-3 text-xs">
              <span className="font-semibold text-muted-foreground">
                Tax Total
              </span>
              <span className="font-bold text-foreground">
                ₹
                {totals.taxTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-foreground">TDS</span>
              <div className="flex items-center gap-3">
                <Select
                  value={String(tdsPercent)}
                  onValueChange={(val) => setTdsPercent(Number(val))}
                  options={tdsOptions}
                  disabled={isView}
                  triggerClassName="h-9 w-36 text-xs rounded-lg"
                />
                <span className="text-sm font-bold w-16 text-right">
                  ₹
                  {totals.tdsAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-foreground">
                Round Off
              </span>
              <div className="flex items-center gap-3">
                <Input
                  type={focusedRoundOff ? "number" : "text"}
                  step="0.01"
                  value={
                    focusedRoundOff
                      ? roundOffInputValue
                      : roundOff.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                  }
                  onFocus={() => {
                    setFocusedRoundOff(true);
                    setRoundOffInputValue(
                      roundOff === 0 ? "" : roundOff.toString(),
                    );
                  }}
                  onBlur={() => {
                    setFocusedRoundOff(false);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRoundOffInputValue(val);
                    const numericVal = Number(val);
                    if (!isNaN(numericVal)) {
                      setRoundOff(numericVal);
                    }
                  }}
                  disabled={isView}
                  className="h-9 w-36 text-xs text-right rounded-lg"
                  placeholder="0.00"
                />
                <span className="text-sm font-bold w-16 text-right">
                  ₹
                  {roundOff.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/20 border border-primary/30 mt-4">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-lg font-black text-foreground">
                ₹
                {totals.grandTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </Card>

          {!isView && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <TooltipLabel label="Share quotation">
                <Button
                  variant="outline"
                  onClick={() => handlePlaceholderAction("Share")}
                  className="h-11 rounded-full border-border bg-card hover:bg-muted text-foreground px-6 text-sm font-semibold flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  Share
                </Button>
              </TooltipLabel>
              <TooltipLabel label="Save this quotation">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={isSubmitting}
                  className="h-11 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground px-8 text-sm font-bold flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </TooltipLabel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationForm;
