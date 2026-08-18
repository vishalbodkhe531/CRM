import * as xlsx from "xlsx";
import { z } from "zod";
import { ROLES } from "../../constants/roles";
import { AppError } from "../../utils/errors/appError";
import { isRecord } from "../../utils/validation/typeGuards";
import type { SafeUser } from "../../types/user.types";
import { leadRepository } from "./lead.repository";
import { itemRepository } from "../item/item.repository";
import { billingRepository } from "../billing/billing.repository";
import { assertBatchWithinLimit } from "../billing/limit.guard";
import {
  CreateLeadSchema,
  type CreateLeadInput,
} from "../../contracts/validation";
import {
  getCellString,
  getDateCell,
  getMobileString,
  normalizeEnumWithMap,
  SOURCE_MAP,
  INDUSTRY_MAP,
  LEAD_TYPE_MAP,
} from "./lead.helpers";

export const mapImportedLeadRow = (row: Record<string, unknown>): CreateLeadInput => {
  const dateValue = getDateCell(row, "Date");
  const mappedData = {
    firstName: getCellString(row, "First Name"),
    lastName: getCellString(row, "Last Name"),
    companyName: getCellString(row, "Company Name"),
    gstin: getCellString(row, "GSTIN") || getCellString(row, "GST No"),
    email: getCellString(row, "Email Address"),
    mobile: getMobileString(row, "Mobile No"),
    alternateMobile: getMobileString(row, "Alternate Mobile No"),
    website: getCellString(row, "Website"),
    linkedInProfile: getCellString(row, "LinkedIn Profile"),
    source: normalizeEnumWithMap(row, "Lead Source", SOURCE_MAP),
    industry: normalizeEnumWithMap(row, "Industry", INDUSTRY_MAP),
    address: getCellString(row, "Address"),
    requiredDescription: getCellString(row, "Required description"),
    leadType: normalizeEnumWithMap(row, "Lead Type", LEAD_TYPE_MAP) || "NEW",
    productInterested:
      getCellString(row, "Item") ||
      getCellString(row, "ITEM") ||
      getCellString(row, "Product Interested"),
    createdAt: dateValue ? dateValue.toISOString() : undefined,
  };

  return CreateLeadSchema.parse(mappedData);
};

export type ImportResult = {
  successCount: number;
  failed: {
    rowNumber: number;
    reason: string;
  }[];
};

export async function importLeads(
  fileBuffer: Buffer,
  user: SafeUser,
  organizationId: string,
): Promise<ImportResult> {
  let workbook: xlsx.WorkBook;

  try {
    workbook = xlsx.read(fileBuffer, { type: "buffer" });
  } catch {
    throw AppError.validation.badRequest(
      "Please upload a valid Excel or CSV file.",
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw AppError.validation.badRequest("Uploaded file is empty.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rawRows.length === 0) {
    throw AppError.validation.badRequest("Uploaded file is empty.");
  }

  const result: ImportResult = {
    successCount: 0,
    failed: [],
  };

  const validLeadInputs: { data: CreateLeadInput; rowNumber: number }[] = [];

  // Step 1: Pre-validation (Pipeline approach)
  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!isRecord(row)) {
      result.failed.push({ rowNumber, reason: "Row data is malformed" });
      return;
    }

    try {
      validLeadInputs.push({
        data: mapImportedLeadRow(row),
        rowNumber,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.failed.push({
          rowNumber,
          reason: error.issues.map((i) => i.message).join(", "),
        });
      } else {
        result.failed.push({ rowNumber, reason: "Unexpected validation error" });
      }
    }
  });

  if (validLeadInputs.length === 0) {
    return result;
  }

  // Deduplication step
  const emailsToCheck = Array.from(new Set(validLeadInputs.map(i => i.data.email).filter(Boolean))) as string[];
  const mobilesToCheck = Array.from(new Set(validLeadInputs.map(i => i.data.mobile).filter(Boolean))) as string[];

  const existingLeads = await leadRepository.findLeadsByEmailsOrMobiles(
    organizationId,
    emailsToCheck,
    mobilesToCheck
  );

  const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
  const existingMobiles = new Set(existingLeads.map(l => l.mobile).filter(Boolean));

  const seenEmails = new Set<string>();
  const seenMobiles = new Set<string>();
  const uniqueInputs: { data: CreateLeadInput; rowNumber: number }[] = [];

  for (const item of validLeadInputs) {
    const { data, rowNumber } = item;
    let isDuplicate = false;
    let reason = "";

    if (data.email) {
      if (existingEmails.has(data.email)) {
        isDuplicate = true;
        reason = `Duplicate: Email ${data.email} already exists`;
      } else if (seenEmails.has(data.email)) {
        isDuplicate = true;
        reason = `Duplicate: Email ${data.email} appears multiple times in file`;
      }
    }

    if (data.mobile && !isDuplicate) {
      if (existingMobiles.has(data.mobile)) {
        isDuplicate = true;
        reason = `Duplicate: Mobile ${data.mobile} already exists`;
      } else if (seenMobiles.has(data.mobile)) {
        isDuplicate = true;
        reason = `Duplicate: Mobile ${data.mobile} appears multiple times in file`;
      }
    }

    if (isDuplicate) {
      result.failed.push({ rowNumber, reason });
    } else {
      if (data.email) seenEmails.add(data.email);
      if (data.mobile) seenMobiles.add(data.mobile);
      uniqueInputs.push(item);
    }
  }

  if (uniqueInputs.length === 0) {
    return result;
  }

  // Step 1.5: Validate productInterested IDs in bulk
  const productInterestedIds = Array.from(new Set(uniqueInputs.map(i => i.data.productInterested).filter(Boolean))) as string[];
  if (productInterestedIds.length > 0) {
    const activeItems = await itemRepository.findActiveItemsByIds(productInterestedIds, organizationId);
    const activeItemIds = new Set(activeItems.map(i => i.id));

    const validProductInputs: { data: CreateLeadInput; rowNumber: number }[] = [];
    for (const item of uniqueInputs) {
      if (item.data.productInterested && !activeItemIds.has(item.data.productInterested)) {
        result.failed.push({ rowNumber: item.rowNumber, reason: `Invalid or inactive product selected for product interest.` });
      } else {
        validProductInputs.push(item);
      }
    }
    uniqueInputs.length = 0;
    uniqueInputs.push(...validProductInputs);
  }

  if (uniqueInputs.length === 0) {
    return result;
  }

  // Plan limit: reject the whole import if the unique rows would cross the
  // MAX_LEADS ceiling. Checked before any number is reserved or row inserted, so
  // nothing is half-created on rejection.
  await assertBatchWithinLimit(
    organizationId,
    "MAX_LEADS",
    billingRepository.countLeads,
    uniqueInputs.length,
  );

  // Step 2: Reserve block of Lead Numbers
  // ALLOW GAPS strategy: We reserve the total count. If an insert fails, that number is lost.
  const { organizationPrefix, startingSequence } =
    await leadRepository.reserveLeadNumbers(
      organizationId,
      uniqueInputs.length,
    );

  let currentSeq = startingSequence;

  // Step 3: Batch Creation with reserved numbers
  const leadsToCreate = uniqueInputs.map(({ data: leadData }) => {
    const leadNo = leadRepository.buildLeadNo(organizationPrefix, currentSeq++);
    const {
      assignedToId,
      source,
      industry,
      leadType,
      status,
      productInterested,
      createdAt,
      ...rest
    } = leadData;

    let resolvedAssignedToId = assignedToId;
    let assignedAt = undefined;
    let assignedById = undefined;

    if (user.role === ROLES.EXECUTIVE || user.role === ROLES.MANAGER) {
      resolvedAssignedToId = user.id;
      assignedAt = new Date();
      assignedById = user.id;
    }

    return {
      ...rest,
      leadNo,
      organizationId,
      source: source || null,
      industry: (industry === "BANKING_FINANCE" ? "BANKING" : industry) as any,
      leadType: leadType || null,
      status: status || "NEW",
      createdById: user.id,
      assignedToId: resolvedAssignedToId || null,
      assignedById: assignedById || null,
      assignedAt: assignedAt || null,
      productInterestId: productInterested || null,
      ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
    };
  });

  const batchSize = 1000;
  for (let i = 0; i < leadsToCreate.length; i += batchSize) {
    const batch = leadsToCreate.slice(i, i + batchSize);
    const batchInputs = uniqueInputs.slice(i, i + batchSize);
    try {
      await leadRepository.createManyLeads(batch);
      result.successCount += batch.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Database error during batch insert";
      batchInputs.forEach(({ rowNumber }) => {
        result.failed.push({ rowNumber, reason: message });
      });
    }
  }

  return result;
}
