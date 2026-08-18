import { numberToWords } from "@/utils/numberToWords";
import { resolveAssetUrl } from "@/utils/assetUrl";
import type { QuotationLineItem } from "../types";

interface PDFOrganizationData {
  name?: string | null;
  address?: string | null;
  gstin?: string | null;
  mobile?: string | null;
  email?: string | null;
  companyLogo?: string | null;
  qrCode?: string | null;
  signature?: string | null;
}

interface PDFPreviewData {
  partyName: string;
  contactPerson: string;
  refNo: string;
  date: string;
  stateOfSupply: string;
  lineItems: QuotationLineItem[];
  totals: {
    totalQty: number;
    subtotal: number;
    taxTotal: number;
    tdsAmount: number;
    grandTotal: number;
  };
  roundOff: number;
  tdsPercent: number;
  description?: string;
  termsAndConditions?: string | string[];
  gstCategory?: string;
  partyAddress?: string;
  partyPostalCode?: string;
  partyGstin?: string | null;
  organization?: PDFOrganizationData | null;
}

export async function openQuotationPDFPreview(data: PDFPreviewData) {
  const {
    partyName,
    contactPerson,
    refNo,
    date,
    stateOfSupply,
    lineItems,
    totals,
    roundOff,
    tdsPercent,
    description,
    termsAndConditions,
    gstCategory,
    partyAddress,
    partyPostalCode,
    partyGstin,
    organization,
  } = data;

  // Generate description block HTML if present
  let descriptionHTML = "";
  if (description && description.trim()) {
    descriptionHTML = `
      <div style="margin-top: 16px; margin-bottom: 8px; padding: 10px 14px; border: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 12px; width: 100%; box-sizing: border-box; text-align: left;">
        <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; tracking-wider; color: #94a3b8; display: block; margin-bottom: 2px;">Description / Notes</span>
        <p style="font-size: 10px; color: #334155; margin: 0; line-height: 1.4; white-space: pre-line;">${description}</p>
      </div>
    `;
  }

  // Generate terms block HTML if present
  let termsHTML = "";
  if (termsAndConditions) {
    let listHTML = "";
    if (Array.isArray(termsAndConditions)) {
      listHTML = termsAndConditions
        .filter((t) => t.trim())
        .map((t) => `<li style="margin-bottom: 4px;">${t}</li>`)
        .join("");
    } else if (
      typeof termsAndConditions === "string" &&
      termsAndConditions.trim()
    ) {
      listHTML = termsAndConditions
        .split("\n")
        .filter((t) => t.trim())
        .map((t) => `<li style="margin-bottom: 4px;">${t}</li>`)
        .join("");
    }

    if (listHTML) {
      termsHTML = `
        <div style="margin-bottom: 24px; text-align: left; width: 100%;">
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; tracking-wider; color: #94a3b8; display: block; margin-bottom: 6px;">Terms & Conditions</span>
          <ol style="font-size: 11px; color: #475569; padding-left: 16px; margin: 0; line-height: 1.4;">
            ${listHTML}
          </ol>
        </div>
      `;
    }
  }

  const escapeHTML = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // Convert uploaded assets to base64 so they work reliably in the popup window.
  async function toBase64(url?: string | null): Promise<string> {
    const resolvedUrl = resolveAssetUrl(url);
    if (!resolvedUrl) return "";

    try {
      const res = await fetch(resolvedUrl);
      if (!res.ok) return "";
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return resolvedUrl;
    }
  }

  const [qrBase64, signatureBase64, companyLogoBase64] = await Promise.all([
    toBase64(organization?.qrCode),
    toBase64(organization?.signature),
    toBase64(organization?.companyLogo),
  ]);

  const companyName = organization?.name?.trim() || "Organization";
  const escapedCompanyName = escapeHTML(companyName);
  const companyInitials =
    companyName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ORG";
  const companyLogoHTML = companyLogoBase64
    ? `<img src="${companyLogoBase64}" style="height: 120px; width: auto; max-width: 180px; object-fit: contain; display: block;" />`
    : `<div style="height: 72px; min-width: 72px; padding: 0 14px; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #004CD0; background: #eef4ff;">${escapeHTML(companyInitials)}</div>`;
  const companyAddressLines = (organization?.address || "")
    .split(/\r?\n|,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
  const companyDetailsHTML = `
    <h2 style="font-weight: 800; font-size: 14px; color: #1e293b; margin: 0 0 2px 0;">
      ${escapedCompanyName}
    </h2>
    ${companyAddressLines.map((line) => `<p style="margin: 0;">${escapeHTML(line)}</p>`).join("")}
    ${organization?.mobile ? `<p style="margin: 0; font-weight: 600; color: #334155;">Phone: ${escapeHTML(organization.mobile)}</p>` : ""}
    ${organization?.email ? `<p style="margin: 0;">Email: ${escapeHTML(organization.email)}</p>` : ""}
    ${organization?.gstin ? `<p style="margin: 0;">GSTIN: ${escapeHTML(organization.gstin)}</p>` : ""}
  `;
  const companyContactBlockHTML = [
    ...companyAddressLines,
    organization?.mobile ? `Ph: ${organization.mobile}` : "",
  ]
    .filter(Boolean)
    .map((line) => escapeHTML(line))
    .join("<br />");
  const qrCodeHTML = qrBase64
    ? `<img src="${qrBase64}" width="400" height="400" style="display: block; object-fit: contain; backgoud" />`
    : `<div style="width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; text-align: center; color: #94a3b8; font-size: 9px; font-weight: 700;">QR not configured</div>`;
  const signatureHTML = signatureBase64
    ? `<img src="${signatureBase64}" width="120" style="display: block; margin-top: 4px; object-fit: contain;" />`
    : `<div style="width: 120px; height: 50px;"></div>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to view the PDF Preview");
    return;
  }

  // State code mapping
  const states: { [key: string]: string } = {
    Delhi: "07",
    Maharashtra: "27",
    "West Bengal": "19",
    Punjab: "03",
    "Tamil Nadu": "33",
    Karnataka: "29",
    Gujarat: "24",
  };
  const stateCode = states[stateOfSupply] || "27";

  // Date formatting
  let formattedDate = date || "";
  if (date) {
    const parts = date.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      formattedDate = `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
    }
  }

  // Active line items
  const activeItems = lineItems.filter(
    (item) => item.itemId && item.quantity > 0,
  );

  // Pagination / Chunking logic
  // If all remaining items fit on the current page with the totals block, we keep them on one page.
  // Otherwise, we split them. Pages without totals block can fit more items.
  const pages: QuotationLineItem[][] = [];
  let i = 0;
  while (i < activeItems.length) {
    const isFirstPage = pages.length === 0;
    const remainingCount = activeItems.length - i;

    let limit = 0;
    if (remainingCount <= 8) {
      // All remaining items fit on this page along with the bottom totals block
      limit = remainingCount;
    } else {
      // Must split. The current page will not show the totals block.
      limit = isFirstPage ? 8 : 9;
    }

    pages.push(activeItems.slice(i, i + limit));
    i += limit;
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  // Tax Breakdown Calculation
  const actualGstCategory =
    gstCategory ||
    (stateOfSupply === "Delhi" || stateOfSupply === "" ? "GST" : "IGST");
  const taxGroups: { [rate: number]: number } = {};

  activeItems.forEach((item) => {
    const rate = item.taxPercent || 0;
    if (rate === 0) return;

    const subtotal = item.quantity * item.price;
    const discount = item.discountAmount || 0;
    const taxableVal = subtotal - discount;

    if (!taxGroups[rate]) {
      taxGroups[rate] = 0;
    }
    taxGroups[rate] += taxableVal;
  });

  let taxBreakdownHTML = "";
  Object.keys(taxGroups).forEach((rateStr) => {
    const rate = Number(rateStr);
    const taxableAmount = taxGroups[rate];
    const taxAmount = Number((taxableAmount * (rate / 100)).toFixed(2));

    if (actualGstCategory === "GST") {
      const halfRate = rate / 2;
      const halfTax = Number((taxAmount / 2).toFixed(2));
      taxBreakdownHTML += `
        <tr class="border-b border-slate-100">
          <td class="py-1 px-1.5 font-bold text-slate-600">SGST</td>
          <td class="py-1 px-1.5 text-right">₹${taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="py-1 px-1.5 text-center">${halfRate}%</td>
          <td class="py-1 px-1.5 text-right font-semibold text-slate-700">₹${halfTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr class="border-b border-slate-100">
          <td class="py-1 px-1.5 font-bold text-slate-600">CGST</td>
          <td class="py-1 px-1.5 text-right">₹${taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="py-1 px-1.5 text-center">${halfRate}%</td>
          <td class="py-1 px-1.5 text-right font-semibold text-slate-700">₹${halfTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    } else if (actualGstCategory === "IGST") {
      taxBreakdownHTML += `
        <tr class="border-b border-slate-100">
          <td class="py-1.5 px-1.5 font-bold text-slate-600">IGST</td>
          <td class="py-1.5 px-1.5 text-right">₹${taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="py-1.5 px-1.5 text-center">${rate}%</td>
          <td class="py-1.5 px-1.5 text-right font-semibold text-slate-700">₹${taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    } else {
      taxBreakdownHTML += `
        <tr class="border-b border-slate-100">
          <td class="py-1.5 px-1.5 font-bold text-slate-600">EXEMPTED</td>
          <td class="py-1.5 px-1.5 text-right">₹${taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="py-1.5 px-1.5 text-center">${rate}%</td>
          <td class="py-1.5 px-1.5 text-right font-semibold text-slate-700">₹${taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }
  });

  const taxTableSectionHTML = taxBreakdownHTML
    ? `
      <div class="space-y-1">
        <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Tax Breakup</span>
        <table class="w-full text-[10px] border-collapse">
          <thead>
            <tr class="bg-[#EEF4FF] text-slate-600 font-semibold border-b border-slate-100">
              <th class="py-0.5 px-1.5 text-left">Tax Type</th>
              <th class="py-0.5 px-1.5 text-right">Taxable Amount</th>
              <th class="py-0.5 px-1.5 text-center">Rate</th>
              <th class="py-0.5 px-1.5 text-right">Tax amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-500">
            ${taxBreakdownHTML}
          </tbody>
        </table>
      </div>
    `
    : "";

  const totalDiscount = activeItems.reduce(
    (acc, curr) => acc + curr.discountAmount,
    0,
  );
  const totalAmountBeforeRounding = activeItems.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );
  const totalDocPages = pages.length + 1; // estimate pages + 1 bank details page

  let sheetsHTML = "";
  let globalItemIndex = 1;

  pages.forEach((pageItems, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const isLastEstimatePage = pageIdx === pages.length - 1;

    // Table rows generation
    let pageTableRowsHTML = "";
    if (pageItems.length > 0) {
      pageItems.forEach((item) => {
        const discountText =
          item.discountAmount > 0
            ? `₹${item.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} <span style="font-size: 9px; color: #94a3b8; margin-left: 1px;">(${item.discountPercent}%)</span>`
            : "₹0.00";

        const taxText =
          item.taxPercent > 0
            ? `₹${item.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} <span style="font-size: 9px; color: #94a3b8; margin-left: 1px;">(${item.taxPercent}%)</span>`
            : "₹0.00";

        pageTableRowsHTML += `
          <tr class="border-b border-slate-100 hover:bg-slate-50/50">
            <td class="py-2.5 px-2 text-center text-slate-500">${globalItemIndex++}</td>
            <td class="py-2.5 px-2 font-semibold text-slate-800">${item.itemName}</td>
            <td class="py-2.5 px-2 text-center text-slate-500">${item.code || "-"}</td>
            <td class="py-2.5 px-2 text-center font-medium">${item.quantity}</td>
            <td class="py-2.5 px-2 text-center text-slate-500">${item.unit}</td>
            <td class="py-2.5 px-2 text-right text-slate-600">₹${item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td class="py-2.5 px-2 text-right text-slate-500">${discountText}</td>
            <td class="py-2.5 px-2 text-right text-slate-500">${taxText}</td>
            <td class="py-2.5 px-2 text-right font-bold text-slate-800">₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      });
    } else {
      pageTableRowsHTML = `
        <tr>
          <td colspan="9" class="py-8 text-center text-slate-400 italic">No items added to estimate</td>
        </tr>
      `;
    }

    const bottomTotalsHTML = isLastEstimatePage
      ? `
        ${descriptionHTML}
        <div class="avoid-break" style="display: grid; grid-template-columns: 7fr 5fr; gap: 24px; align-items: end; margin-top: 12px; box-sizing: border-box;">
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${taxTableSectionHTML}
            <div style="padding: 10px; background-color: #EEF4FF; border-left: 4px solid #004CD0; border-top-right-radius: 12px; border-bottom-right-radius: 12px; display: flex; flex-direction: column; gap: 2px;">
              <div style="font-size: 8px; font-weight: 800; color: #003399; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1;">Estimate Amount In Words:</div>
              <div style="font-size: 10px; font-weight: 700; color: #1e293b; line-height: 1.4; word-wrap: break-word;">
                ${numberToWords(totals.grandTotal)}
              </div>
            </div>
          </div>

          <div class="bg-slate-50 border border-slate-200/60 p-3.5" style="border-radius: 16px; display: flex; flex-direction: column; gap: 8px; font-size: 11px; box-sizing: border-box;">
            <h4 style="font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 2px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Amounts</h4>
            <div style="display: flex; justify-content: space-between; color: #475569; font-weight: 500;">
              <span>Sub Total</span>
              <span>₹${totals.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            ${
              totals.taxTotal > 0
                ? `
              <div style="display: flex; justify-content: space-between; color: #475569; font-weight: 500;">
                <span>GST Total</span>
                <span>₹${totals.taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            `
                : ""
            }
            ${
              totals.tdsAmount > 0
                ? `
              <div style="display: flex; justify-content: space-between; color: #475569; font-weight: 500;">
                <span>TDS (${tdsPercent}%)</span>
                <span style="color: #ef4444;">-₹${totals.tdsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            `
                : ""
            }
            ${
              roundOff !== 0
                ? `
              <div style="display: flex; justify-content: space-between; color: #475569; font-weight: 500;">
                <span>Round off</span>
                <span>₹${roundOff.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            `
                : ""
            }
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 13px; padding-top: 6px; border-top: 1px solid #e2e8f0; color: #1e293b;">
              <span>Total</span>
              <span style="color: #004CD0;">₹${totals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      `
      : "";

    const pageHeaderHTML = isFirstPage
      ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; font-size: 12px;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px;">Estimate for</span>
            <h3 style="font-weight: 900; font-size: 14px; color: #1e293b; margin: 0 0 2px 0;">${partyName || "N/A"}</h3>
            ${contactPerson ? `<p style="color: #475569; font-weight: 500; margin: 0;">Attn: ${contactPerson}</p>` : ""}
            <p style="color: #64748b; line-height: 1.4; max-width: 260px; margin: 0; white-space: pre-line;">${partyAddress || "No address details"}</p>
            ${partyPostalCode ? `<p style="color: #64748b; margin: 0;">PIN: ${partyPostalCode}</p>` : ""}
            <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 2px;">
              <p style="margin: 0;"><span style="font-weight: 700; color: #475569;">GSTIN :</span> ${partyGstin?.trim() ? partyGstin.trim() : (stateCode ? `${stateCode}WHBIFAY89` : "2467WHBIFAY89")}</p>
              <p style="margin: 0;"><span style="font-weight: 700; color: #475569;">State :</span> ${stateCode && stateOfSupply ? `${stateCode}- ${stateOfSupply}` : "27- Maharashtra"}</p>
            </div>
          </div>

          <div style="text-align: right; display: flex; flex-direction: column; gap: 4px;">
            <span style="color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px;">Estimate Details</span>
            <p style="margin: 0;"><span style="font-weight: 700; color: #475569;">Ref No:</span> ${refNo || "N/A"}</p>
            <p style="margin: 0;"><span style="font-weight: 700; color: #475569;">Date:</span> ${formattedDate || "N/A"}</p>
            <p style="margin: 0;"><span style="font-weight: 700; color: #475569;">State of Supply:</span> ${stateOfSupply || "N/A"}</p>
            ${companyContactBlockHTML ? `<p style="color: #94a3b8; line-height: 1.4; margin: 8px 0 0 0;">${companyContactBlockHTML}</p>` : ""}
          </div>
        </div>
      `
      : `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; box-sizing: border-box;">
          <span>Estimate No: <strong>${refNo}</strong></span>
          <span>Client: <strong>${partyName}</strong></span>
          <span>Date: <strong>${formattedDate}</strong></span>
        </div>
      `;

    sheetsHTML += `
      <!-- PAGE ${pageIdx + 1}: ESTIMATE SHEET -->
      <div class="sheet-preview">
        <div class="print-sheet estimate-sheet">
          <div style="display: flex; flex-direction: column; gap: 10px;">
          
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="display: flex; align-items: center;">
              ${companyLogoHTML}
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b; line-height: 1.5; max-width: 380px;">
              ${companyDetailsHTML}
            </div>
          </div>

          <div style="width: 100%; text-align: center; border-top: 1px solid rgba(0, 76, 208, 0.3); border-bottom: 1px solid rgba(0, 76, 208, 0.3); font-size: 11px; font-weight: 900; letter-spacing: 0.1em; color: #003399; background-color: rgba(238, 244, 255, 0.7); text-transform: uppercase; padding: 6px 0;">
            Quotation
          </div>

          ${pageHeaderHTML}

          <table class="w-full text-xs border-collapse" style="margin-top: 8px;">
            <thead>
              <tr class="bg-[#EEF4FF] text-slate-700 font-bold border-b border-slate-200">
                <th class="py-2 px-2 text-center" style="width: 44px; border-top-left-radius: 8px; border-bottom-left-radius: 8px;">Sr no</th>
                <th class="py-2 px-2 text-left">Item</th>
                <th class="py-2 px-2 text-center" style="width: 80px;">HSN/SAC</th>
                <th class="py-2 px-2 text-center" style="width: 50px;">Qty</th>
                <th class="py-2 px-2 text-center" style="width: 50px;">Unit</th>
                <th class="py-2 px-2 text-right" style="width: 90px;">Price/unit</th>
                <th class="py-2 px-2 text-right" style="width: 106px;">Discount</th>
                <th class="py-2 px-2 text-right" style="width: 90px;">GST</th>
                <th class="py-2 px-2 text-right" style="width: 90px; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${pageTableRowsHTML}
            </tbody>
            ${
              isLastEstimatePage
                ? `
              <tfoot>
                <tr class="border-t border-b border-slate-800 font-extrabold text-slate-800" style="font-weight: 800;">
                  <td colspan="2" class="py-2 px-2 text-left" style="text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Total</td>
                  <td></td>
                  <td class="py-2 px-2 text-center">${totals.totalQty}</td>
                  <td></td>
                  <td></td>
                  <td class="py-2 px-2 text-right text-slate-600">₹${totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td class="py-2 px-2 text-right text-slate-600">₹${totals.taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td class="py-2 px-2 text-right" style="font-weight: 900; font-size: 12px; color: #000;">₹${totalAmountBeforeRounding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            `
                : ""
            }
          </table>
        </div>

        ${bottomTotalsHTML}

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; font-weight: 500; margin-top: auto;">
          <span>Page ${pageIdx + 1} of ${totalDocPages}</span>
          <span style="color: #004CD0; font-weight: 700;">${escapedCompanyName} • Quotation</span>
          <span>${isLastEstimatePage ? "" : "Continued on next page"}</span>
        </div>
      </div>
      </div>
    `;
  });

  const stylesHTML = Array.from(
    document.querySelectorAll("style, link[rel='stylesheet']"),
  )
    .map((el) => el.outerHTML)
    .join("\n");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Estimate Preview - ${refNo}</title>
      ${stylesHTML}
      <style>
        :root {
          --preview-scale: 1;
          --preview-width: 210mm;
          --preview-height: 297mm;
        }

        * {
          box-sizing: border-box;
        }

        html {
          background-color: #0b0f19 !important;
          min-height: 100%;
          overflow-x: hidden;
        }

        body {
          background-color: #0b0f19 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          min-width: 0;
          min-height: 100%;
          overflow-x: hidden;
          font-family: 'Poppins', 'Inter', sans-serif;
        }
        
        .sticky-toolbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background-color: #1e293b;
          border-bottom: 1px solid #334155;
          padding: 12px clamp(12px, 4vw, 24px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 16px;
          color: white;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .toolbar-meta {
          display: flex;
          flex: 1 1 180px;
          min-width: 0;
          flex-direction: column;
        }
        
        .toolbar-title {
          font-weight: 700;
          font-size: 16px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .toolbar-subtitle {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .toolbar-actions {
          display: flex;
          flex: 0 1 auto;
          gap: 8px;
          min-width: 0;
        }

        .btn-emerald {
          background-color: #004CD0;
          color: white;
          font-weight: 700;
          font-size: 12px;
          border-radius: 9999px;
          height: 36px;
          padding: 0 16px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .btn-emerald:hover {
          background-color: #003CAA;
        }

        .btn-slate {
          background-color: #334155;
          color: #e2e8f0;
          font-weight: 700;
          font-size: 12px;
          border-radius: 9999px;
          height: 36px;
          padding: 0 16px;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .btn-slate:hover {
          background-color: #475569;
          color: white;
        }

        .page-container {
          width: 100%;
          max-width: 100vw;
          padding: clamp(12px, 4vw, 32px) clamp(8px, 3vw, 16px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          background-color: #0f172a;
          min-height: calc(100vh - 61px);
          min-height: calc(100dvh - 61px);
          overflow-x: hidden;
        }

        .sheet-preview {
          position: relative;
          width: var(--preview-width);
          height: var(--preview-height);
          max-width: 100%;
          flex: 0 0 auto;
        }

        .print-sheet {
          width: 210mm;
          height: 297mm;
          max-height: 297mm;
          min-height: 297mm;
          background-color: white;
          color: #1e293b;
          padding: 45px;
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          overflow: hidden;
          transform: scale(var(--preview-scale));
          transform-origin: top left;
        }

        .avoid-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        @media screen and (max-width: 640px) {
          .sticky-toolbar {
            align-items: stretch;
          }

          .toolbar-meta,
          .toolbar-actions {
            flex-basis: 100%;
            width: 100%;
          }

          .toolbar-actions {
            flex-wrap: wrap;
          }

          .btn-emerald,
          .btn-slate {
            flex: 1 1 0;
            min-width: 0;
            padding: 0 10px;
            font-size: 11px;
          }

          .page-container {
            gap: 18px;
          }
        }

        @media print {
          html,
          body {
            background-color: white !important;
            color: black !important;
            overflow: visible !important;
          }
          .sticky-toolbar {
            display: none !important;
          }
          .page-container {
            padding: 0 !important;
            background-color: white !important;
            display: block !important;
            gap: 0 !important;
          }
          .sheet-preview {
            width: auto !important;
            height: auto !important;
            max-width: none !important;
          }
          .print-sheet {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            min-height: 297mm !important;
            box-shadow: none !important;
            border: none !important;
            padding: 15mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            transform: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      
      <!-- Sticky Toolbar -->
      <div class="sticky-toolbar">
        <div class="toolbar-meta">
          <div class="toolbar-title">Document Preview</div>
          <div class="toolbar-subtitle">Estimate / Quotation: ${refNo}</div>
        </div>
        <div class="toolbar-actions">
          <button onclick="window.print()" class="btn-emerald">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print / Save PDF
          </button>
          <button onclick="window.close()" class="btn-slate">
            Close Preview
          </button>
        </div>
      </div>

      <!-- Preview sheets container -->
      <div class="page-container">
        
        ${sheetsHTML}

      <!-- FINAL PAGE: BANK DETAILS -->
        <div class="sheet-preview">
          <div class="print-sheet bank-sheet">
            <div style="display: flex; flex-direction: column;">
            <!-- Letterhead Top Header -->
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="display: flex; align-items: center;">
                ${companyLogoHTML}
              </div>

              <div style="text-align: right; font-size: 12px; color: #64748b; line-height: 1.5; max-width: 380px;">
                ${companyDetailsHTML}
   
              </div>
            </div>

            ${termsHTML}

            <!-- Bank Details Header Banner -->
            <div style="
              width: 100%;
              text-align: center;
              border-top: 1px solid rgba(0, 76, 208, 0.3);
              border-bottom: 1px solid rgba(0, 76, 208, 0.3);
              font-size: 12px;
              font-weight: 900;
              letter-spacing: 0.1em;
              color: #003399;
              background-color: rgba(238, 244, 255, 0.7);
              text-transform: uppercase;
              padding: 7px 0;
              margin-top: 14px;
            ">
              Bank Details
            </div>

            <!-- Bank Details Block -->
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 18px;
              padding: 20px 22px;
              border: 1px solid rgba(126, 217, 87, 0.25);
              background: linear-gradient(135deg, rgba(240, 253, 244, 0.45), rgba(255, 255, 255, 0.95));
              border-radius: 14px;
              box-sizing: border-box;
              margin-top: 14px;
              width: 100%;
            ">

              <!-- LEFT: QR -->
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 0 0 105px;
              ">
                <div style="
                  width: 100px;
                  height: 100px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background-color: #ffffff;
                  border: 1px solid rgba(126, 217, 87, 0.35);
                  border-radius: 12px;
                  box-shadow: 0 4px 2px rgba(15, 23, 42, 0.06);
                  box-sizing: border-box;
                ">
                  ${qrCodeHTML}
                </div>
              </div>

              <!-- CENTER: Bank Text Info -->
              <div style="
                flex: 1;
                min-width: 0;
              ">
                <div style="
                  display: grid;
                  grid-template-columns: 125px 1fr;
                  gap: 7px 10px;
                  font-size: 12.5px;
                  line-height: 1.35;
                  color: #475569;
                  font-weight: 500;
                  width: 100%;
                ">
                  <span style="font-weight: 800; color: #64748b;">Name</span>
                  <span style="color: #1e293b; font-weight: 600; word-break: break-word;">: HDFC</span>

                  <span style="font-weight: 800; color: #64748b;">Bank Account No.</span>
                  <span style="color: #1e293b; font-weight: 800; letter-spacing: 0.02em; word-break: break-word;">: 50200082112212</span>

                  <span style="font-weight: 800; color: #64748b;">IFSC Code</span>
                  <span style="color: #1e293b; font-weight: 800; letter-spacing: 0.04em; word-break: break-word;">: HDFC0005332</span>

                  <span style="font-weight: 800; color: #64748b;">Holder's Name</span>
                  <span style="color: #1e293b; font-weight: 600; word-break: break-word;">: ABC</span>
                </div>
              </div>

              <!-- RIGHT: Signature block -->
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-end;
                gap: 6px;
                flex: 0 0 125px;
                min-width: 125px;
              ">
                <div style="
                  width: 100%;
                  min-height: 52px;
                  display: flex;
                  align-items: flex-end;
                  justify-content: center;
                ">
                  ${signatureHTML}
                </div>

                <div style="
                  border-top: 1px solid #334155;
                  width: 100%;
                  padding-top: 5px;
                  text-align: center;
                ">
                  <span style="
                    font-size: 9px;
                    font-weight: 800;
                    color: #1e293b;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    white-space: nowrap;
                  ">
                    Authorized Signatory
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- Auto trigger browser print window after A4 fonts/styles load -->
      <script>
        const updatePreviewScale = () => {
          const root = document.documentElement;
          const container = document.querySelector('.page-container');
          const firstSheet = document.querySelector('.print-sheet');

          if (!container || !firstSheet) {
            return;
          }

          const containerStyles = window.getComputedStyle(container);
          const horizontalPadding =
            parseFloat(containerStyles.paddingLeft || '0') +
            parseFloat(containerStyles.paddingRight || '0');
          const viewportWidth =
            window.visualViewport && window.visualViewport.width
              ? window.visualViewport.width
              : document.documentElement.clientWidth || window.innerWidth;
          const sheetWidth = firstSheet.offsetWidth;
          const sheetHeight = firstSheet.offsetHeight;

          if (!sheetWidth || !sheetHeight) {
            return;
          }

          const availableWidth = Math.max(1, viewportWidth - horizontalPadding);
          const scale = Math.min(1, availableWidth / sheetWidth);

          root.style.setProperty('--preview-scale', scale.toFixed(4));
          root.style.setProperty('--preview-width', (sheetWidth * scale).toFixed(2) + 'px');
          root.style.setProperty('--preview-height', (sheetHeight * scale).toFixed(2) + 'px');
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', updatePreviewScale);
        } else {
          updatePreviewScale();
        }

        window.addEventListener('resize', updatePreviewScale);
        window.addEventListener('orientationchange', () => {
          window.setTimeout(updatePreviewScale, 150);
        });

        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', updatePreviewScale);
        }

        window.addEventListener('load', () => {
          updatePreviewScale();
          setTimeout(() => {
            updatePreviewScale();
            window.print();
          }, 500);
        });
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
