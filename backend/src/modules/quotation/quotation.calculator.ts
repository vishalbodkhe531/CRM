import { Prisma } from "@prisma/client";
import type { CreateQuotationInput } from "../../contracts/validation";

type QuotationDetailsInput = CreateQuotationInput["details"];

const decimal = (value: number | string | Prisma.Decimal) => new Prisma.Decimal(value);
const money = (value: Prisma.Decimal) => value.toDecimalPlaces(2);
const toNumber = (value: Prisma.Decimal) => Number(value.toFixed(2));

export interface ItemSnapshot {
  id: string;
  name: string;
  hsnCode: string | null;
  sacCode: string | null;
}

export interface CalculatedQuotation {
  details: QuotationDetailsInput;
  totals: {
    subtotal: Prisma.Decimal;
    taxTotal: Prisma.Decimal;
    tdsAmount: Prisma.Decimal;
    roundOff: Prisma.Decimal;
    grandTotal: Prisma.Decimal;
  };
}

/**
 * Calculates all monetary fields on the trusted server.
 *
 * Item name and HSN/SAC code are snapshotted from the item master. Negotiated
 * price, quantity, unit, discount and allowed tax rate remain quotation inputs.
 */
export function calculateQuotation(
  input: QuotationDetailsInput,
  itemSnapshots: Map<string, ItemSnapshot>,
): CalculatedQuotation {
  let subtotal = decimal(0);
  let taxTotal = decimal(0);

  const items = input.items.map((line) => {
    const snapshot = itemSnapshots.get(line.itemId);
    if (!snapshot) {
      throw new Error(`Missing validated item snapshot for ${line.itemId}`);
    }

    const quantity = decimal(line.quantity);
    const price = decimal(line.price);
    const discountPercent = decimal(line.discountPercent);
    const effectiveTaxPercent =
      input.gstCategory === "EXEMPTED" ? decimal(0) : decimal(line.taxPercent);

    const grossAmount = money(quantity.mul(price));
    const discountAmount = money(grossAmount.mul(discountPercent).div(100));
    const taxableAmount = money(grossAmount.minus(discountAmount));
    const taxAmount = money(taxableAmount.mul(effectiveTaxPercent).div(100));
    const amount = money(taxableAmount.plus(taxAmount));

    subtotal = subtotal.plus(taxableAmount);
    taxTotal = taxTotal.plus(taxAmount);

    return {
      ...line,
      itemName: snapshot.name,
      code: snapshot.hsnCode || snapshot.sacCode || line.code,
      discountAmount: toNumber(discountAmount),
      taxPercent: Number(effectiveTaxPercent.toString()),
      taxAmount: toNumber(taxAmount),
      amount: toNumber(amount),
    };
  });

  subtotal = money(subtotal);
  taxTotal = money(taxTotal);
  const tdsAmount = money(subtotal.mul(decimal(input.tdsPercent)).div(100));
  const roundOff = money(decimal(input.roundOff));
  const grandTotal = money(subtotal.plus(taxTotal).minus(tdsAmount).plus(roundOff));

  if (grandTotal.isNegative()) {
    throw new Error("Grand total cannot be negative");
  }

  return {
    details: {
      ...input,
      items,
      subtotal: toNumber(subtotal),
      taxTotal: toNumber(taxTotal),
      tdsAmount: toNumber(tdsAmount),
      roundOff: toNumber(roundOff),
      grandTotal: toNumber(grandTotal),
    },
    totals: {
      subtotal,
      taxTotal,
      tdsAmount,
      roundOff,
      grandTotal,
    },
  };
}
