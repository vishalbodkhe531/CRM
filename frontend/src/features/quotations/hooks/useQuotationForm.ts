import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useItems } from "@/features/items";
import { useProspects } from "@/features/prospects";
import { useQuotations } from "./useQuotations";
import { z } from "zod";
import type {
  QuotationFormValues,
  QuotationLineItem,
  QuotationDetails,
  Quotation,
  QuotationGstCategory,
} from "../types";
import { toast } from "sonner";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

export interface MappedParty {
  id: string;
  name: string;
  contactPerson: string;
  address: string;
  postalCode: string;
  state: string;
  gstin?: string | null;
}

const QUALIFIED_LEAD_STATUS = "QUALIFIED" as const;
const GST_CATEGORIES: QuotationGstCategory[] = ["GST", "IGST", "EXEMPTED"];

const isQuotationGstCategory = (
  value?: string,
): value is QuotationGstCategory =>
  GST_CATEGORIES.includes(value as QuotationGstCategory);

const quotationFrontendSchema = z.object({
  partyId: z.string().trim().min(1, "Please select a party"),
  refNoPrefix: z.string().trim().min(1, "Ref No. prefix is required"),
  refNoSuffix: z.string().trim().min(1, "Ref No. suffix is required"),
  invoiceDate: z
    .string()
    .trim()
    .min(1, "Invoice Date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Invoice Date is invalid",
    }),
  stateOfSupply: z.string().trim().min(1, "State of supply is required"),
  gstCategory: z.enum(["GST", "IGST", "EXEMPTED"]),
  items: z
    .array(
      z.object({
        itemId: z.string().trim().min(1, "Please select an item"),
        quantity: z.number().positive("Quantity must be greater than 0"),
      }),
    )
    .min(1, "At least one item with valid quantity is required"),
});

export const useQuotationForm = (quotation?: Quotation) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);

  // Mutations access from useQuotations
  const { mutations } = useQuotations();

  // Load items from items feature
  const { data: itemsData } = useItems({
    limit: 100,
  });
  const itemsList = useMemo(() => itemsData?.data || [], [itemsData]);

  // Load converted lead records and keep only qualified leads for Party selection.
  const { data: prospectsData, isLoading: isProspectsLoading } = useProspects({
    status: QUALIFIED_LEAD_STATUS,
    limit: 100,
  });

  const prospectsList = useMemo(
    () =>
      (prospectsData?.data || []).filter(
        (prospect) => prospect.lead?.status === QUALIFIED_LEAD_STATUS,
      ),
    [prospectsData],
  );

  // Map prospects to MappedParty structure
  const parties = useMemo<MappedParty[]>(() => {
    return prospectsList.map((prospect) => {
      const lead = prospect.lead;
      const contactPerson = lead
        ? [lead.firstName, lead.lastName].filter(Boolean).join(" ")
        : "";
      const name =
        lead?.companyName || contactPerson || `Prospect ${prospect.prospectNo}`;

      const addressParts = [
        lead?.address,
        lead?.city,
        lead?.state,
        lead?.pinCode,
      ].filter(Boolean);
      const address = addressParts.join(", ") || "No address details";

      return {
        id: prospect.id,
        name,
        contactPerson,
        address,
        postalCode: lead?.pinCode || "",
        state: lead?.state || "",
        gstin: lead?.gstin || null,
      };
    });
  }, [prospectsList]);

  // Form States
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [refNoPrefix, setRefNoPrefix] = useState<string>("EBS/26 -");
  const [refNoSuffix, setRefNoSuffix] = useState<string>("2");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0], // current date
  );
  const [stateOfSupply, setStateOfSupply] = useState<string>("");
  const [gstCategory, setGstCategory] =
    useState<QuotationGstCategory>("GST");
  const [description, setDescription] = useState<string>("");
  const [termsAndConditionsList, setTermsAndConditionsList] = useState<
    string[]
  >([]);
  const [images, setImages] = useState<
    { name: string; data: string; size?: string }[]
  >([]);
  const [documents, setDocuments] = useState<
    { name: string; data: string; size?: string }[]
  >([]);

  const addTermsAndConditions = () => {
    setTermsAndConditionsList((prev) => [...prev, ""]);
  };

  const updateTermsAndConditions = (index: number, value: string) => {
    setTermsAndConditionsList((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const removeTermsAndConditions = (index: number) => {
    setTermsAndConditionsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addImage = (name: string, data: string, size?: string) => {
    setImages((prev) => [...prev, { name, data, size }]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addDocument = (name: string, data: string, size?: string) => {
    setDocuments((prev) => [...prev, { name, data, size }]);
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Line items state (initialized with 2 blank rows)
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([
    {
      itemId: "",
      itemName: "",
      code: "",
      quantity: 0,
      unit: "Nos",
      price: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      taxAmount: 0,
      amount: 0,
    },
    {
      itemId: "",
      itemName: "",
      code: "",
      quantity: 0,
      unit: "Nos",
      price: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      taxAmount: 0,
      amount: 0,
    },
  ]);

  const [tdsPercent, setTdsPercent] = useState<number>(0); // 0 = None
  const [roundOff, setRoundOff] = useState<number>(0.0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find selected party info
  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  const handlePartyChange = (partyId: string) => {
    setSelectedPartyId(partyId);
    const party = parties.find((p) => p.id === partyId);
    if (party) {
      setStateOfSupply(party.state);
    }
  };

  // Pre-populate fields if editing/viewing existing quotation
  useEffect(() => {
    if (quotation) {
      if (quotation.prospectId) {
        setSelectedPartyId(quotation.prospectId);
      } else {
        const matchingParty = parties.find(
          (p) =>
            p.name.toLowerCase() === quotation.partyName.toLowerCase() ||
            p.contactPerson.toLowerCase() ===
              quotation.contactPerson.toLowerCase(),
        );
        if (matchingParty) {
          setSelectedPartyId(matchingParty.id);
        }
      }

      // Parse refNo
      const refNoParts = quotation.refNo.split(" ");
      if (refNoParts.length > 1) {
        const suffix = refNoParts.pop() || "";
        const prefix = refNoParts.join(" ") + " ";
        setRefNoPrefix(prefix);
        setRefNoSuffix(suffix);
      } else {
        setRefNoPrefix(quotation.refNo);
        setRefNoSuffix("");
      }

      setInvoiceDate(quotation.date);

      if (quotation.details) {
        setStateOfSupply(quotation.details.stateOfSupply);
        setDescription(quotation.details.description || "");

        // Load GST Category (fallback to legacy logic if missing)
        const savedGst = quotation.details.gstCategory;
        if (isQuotationGstCategory(savedGst)) {
          setGstCategory(savedGst);
        } else {
          setGstCategory(
            quotation.details.stateOfSupply === "Delhi" ||
              quotation.details.stateOfSupply === ""
              ? "GST"
              : "IGST",
          );
        }

        // Load terms and conditions
        const terms = quotation.details.termsAndConditions;
        if (Array.isArray(terms)) {
          setTermsAndConditionsList(
            terms.filter((t): t is string => typeof t === "string"),
          );
        } else if (typeof terms === "string" && terms.trim()) {
          setTermsAndConditionsList(
            terms
              .split("\n")
              .map((t) => t.trim())
              .filter(Boolean),
          );
        } else {
          setTermsAndConditionsList([]);
        }

        // Load images and documents
        setImages(
          Array.isArray(quotation.details.images)
            ? quotation.details.images.filter(
                (img) =>
                  img &&
                  typeof img.name === "string" &&
                  typeof img.data === "string",
              )
            : [],
        );
        setDocuments(
          Array.isArray(quotation.details.documents)
            ? quotation.details.documents.filter(
                (doc) =>
                  doc &&
                  typeof doc.name === "string" &&
                  typeof doc.data === "string",
              )
            : [],
        );

        setTdsPercent(quotation.details.tdsPercent);
        setRoundOff(quotation.details.roundOff);
        setLineItems(quotation.details.items || []);
      }
    }
  }, [quotation, parties]);

  // Recalculate row amounts helper
  const calculateRow = (
    qty: number,
    price: number,
    discPercent: number,
    taxPercent: number,
  ) => {
    const sub = qty * price;
    const discountAmount = Number((sub * (discPercent / 100)).toFixed(2));
    const taxableValue = sub - discountAmount;
    const taxAmount = Number((taxableValue * (taxPercent / 100)).toFixed(2));
    const amount = Number((taxableValue + taxAmount).toFixed(2));

    return {
      discountAmount,
      taxAmount,
      amount,
    };
  };

  // Handlers for line items
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        itemId: "",
        itemName: "",
        code: "",
        quantity: 0,
        unit: "Nos",
        price: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 18,
        taxAmount: 0,
        amount: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      toast.warning("At least one line item is required.");
      return;
    }
    const updated = [...lineItems];
    updated.splice(index, 1);
    setLineItems(updated);
  };

  const updateLineItem = (
    index: number,
    fields: Partial<QuotationLineItem>,
  ) => {
    const updated = [...lineItems];
    const item = { ...updated[index], ...fields };

    // Handle Item Selection change
    if (fields.itemId !== undefined) {
      const selectedItem = itemsList.find((i) => i.id === fields.itemId);
      if (selectedItem) {
        item.itemName = selectedItem.name;
        item.code = selectedItem.hsnCode || selectedItem.sacCode || "894537"; // fallback mock HSN code if empty
        item.price = selectedItem.price || 0;
        item.taxPercent = selectedItem.gstRate ?? 18;
        item.quantity = item.quantity || 1; // default to 1 if 0
      } else {
        item.itemName = "";
        item.code = "";
        item.price = 0;
        item.taxPercent = 18;
      }
    }

    // Recalculate row math
    const { discountAmount, taxAmount, amount } = calculateRow(
      item.quantity,
      item.price,
      item.discountPercent,
      item.taxPercent,
    );

    item.discountAmount = discountAmount;
    item.taxAmount = taxAmount;
    item.amount = amount;

    updated[index] = item;
    setLineItems(updated);
  };

  // Recalculate discount percentage if discount amount changes directly
  const updateLineItemDiscountAmount = (index: number, discountAmt: number) => {
    const updated = [...lineItems];
    const item = { ...updated[index] };
    const rowSubtotal = item.quantity * item.price;

    let percent = 0;
    if (rowSubtotal > 0) {
      percent = Number(((discountAmt / rowSubtotal) * 100).toFixed(2));
    }

    item.discountPercent = percent;
    item.discountAmount = discountAmt;

    const taxableValue = rowSubtotal - discountAmt;
    const taxAmount = Number(
      (taxableValue * (item.taxPercent / 100)).toFixed(2),
    );
    item.taxAmount = taxAmount;
    item.amount = Number((taxableValue + taxAmount).toFixed(2));

    updated[index] = item;
    setLineItems(updated);
  };

  // Recalculate Totals
  const totals = useMemo(() => {
    let qtySum = 0;
    let subtotalSum = 0;
    let taxSum = 0;

    lineItems.forEach((item) => {
      qtySum += Number(item.quantity) || 0;
      const rowSubtotal =
        (Number(item.quantity) || 0) * (Number(item.price) || 0);
      const rowTaxable = rowSubtotal - (Number(item.discountAmount) || 0);
      subtotalSum += rowTaxable;
      taxSum += Number(item.taxAmount) || 0;
    });

    const tdsAmount = Number((subtotalSum * (tdsPercent / 100)).toFixed(2));
    const grandTotal = Number(
      (subtotalSum + taxSum - tdsAmount + roundOff).toFixed(2),
    );

    return {
      totalQty: qtySum,
      subtotal: subtotalSum,
      taxTotal: taxSum,
      tdsAmount,
      grandTotal,
    };
  }, [lineItems, tdsPercent, roundOff]);

  const validate = (): { isValid: boolean; firstError?: string } => {
    const result = quotationFrontendSchema.safeParse({
      partyId: selectedPartyId,
      refNoPrefix,
      refNoSuffix,
      invoiceDate,
      stateOfSupply,
      gstCategory,
      items: lineItems
        .filter((item) => item.itemId || item.quantity > 0)
        .map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
        })),
    });

    if (result.success) {
      setErrors({});
      return { isValid: true };
    }

    const errs: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const [field] = issue.path;
      const key = field === "items" ? "items" : String(field);
      if (!errs[key]) {
        errs[key] = issue.message;
      }
    });

    setErrors(errs);
    return { isValid: false, firstError: result.error.issues[0]?.message };
  };

  const handleSave = async (isDraftPlaceholder = false) => {
    if (isDraftPlaceholder) {
      toast.info("Save Draft functionality is coming soon!");
      return;
    }

    const { isValid, firstError } = validate();
    if (!isValid) {
      toast.error(firstError || "Validation failed.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build form details
      const detailPayload: QuotationDetails = {
        partyAddress: selectedParty?.address || "No address details",
        partyPostalCode: selectedParty?.postalCode || "000000",
        stateOfSupply: stateOfSupply,
        refNoSuffix: refNoSuffix,
        items: lineItems.filter((item) => item.itemId && item.quantity > 0),
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        tdsPercent: tdsPercent,
        tdsAmount: totals.tdsAmount,
        roundOff: roundOff,
        grandTotal: totals.grandTotal,
        description: description,
        termsAndConditions: termsAndConditionsList.filter(
          (t): t is string => typeof t === "string" && t.trim() !== "",
        ),
        gstCategory: gstCategory,
        images: images.filter(
          (img) =>
            img && typeof img.name === "string" && typeof img.data === "string",
        ),
        documents: documents.filter(
          (doc) =>
            doc && typeof doc.name === "string" && typeof doc.data === "string",
        ),
      };

      const payload: QuotationFormValues = {
        partyName: selectedParty?.name || "",
        contactPerson: selectedParty?.contactPerson || "",
        refNo: `${refNoPrefix} ${refNoSuffix}`,
        date: invoiceDate,
        status: quotation?.status || "PENDING",
        assignedToId: quotation?.assignedToId || "",
        prospectId: selectedPartyId || null,
        details: detailPayload,
      };

      if (quotation) {
        // Update quotation
        await mutations.updateQuotation(quotation.id, payload);
        toast.success("Quotation updated successfully!");
      } else {
        // Create quotation
        await mutations.createQuotation(payload);
        toast.success("Quotation created successfully!");
      }
      navigate(scopedPath("/quotations"));
    } catch (err: unknown) {
      const fallbackMessage = quotation
        ? "Failed to update quotation."
        : "Failed to create quotation.";
      const typedError = err as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      const errMsg =
        typedError.response?.data?.error ||
        typedError.response?.data?.message ||
        typedError.message ||
        fallbackMessage;
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    itemsList,
    selectedPartyId,
    setSelectedPartyId: handlePartyChange,
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
  };
};
