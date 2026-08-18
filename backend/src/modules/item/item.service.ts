import {
  ItemStatus as PrismaItemStatus,
  ItemType as PrismaItemType,
  Prisma,
} from "@prisma/client";
import { AppError } from "../../utils/errors/appError";
import { itemRepository } from "./item.repository";
import { billingRepository } from "../billing/billing.repository";
import { assertWithinLimit } from "../billing/limit.guard";
import type {
  CreateItemInput,
  ItemFilterInput,
  UpdateItemInput,
} from "../../contracts/validation";
import type { Item } from "../../contracts/types";
import { prisma, DB } from "../../config/db";

const mapToItem = (item: {
  id: string;
  name: string;
  itemCode: string | null;
  itemType: Item["itemType"];
  hsnCode: string | null;
  sacCode: string | null;
  gstRate: number;
  price: number;
  description: string | null;
  status: Item["status"];
  organizationId: string;
  createdAt?: Date;
  updatedAt?: Date;
}): Item => ({
  id: item.id,
  name: item.name,
  itemCode: item.itemCode,
  itemType: item.itemType,
  hsnCode: item.hsnCode,
  sacCode: item.sacCode,
  gstRate: item.gstRate,
  price: item.price,
  description: item.description,
  status: item.status,
  organizationId: item.organizationId,
  createdAt: item.createdAt?.toISOString() ?? new Date(0).toISOString(),
  updatedAt: item.updatedAt?.toISOString() ?? new Date(0).toISOString(),
});

export const itemService = {
  async getItems(params: ItemFilterInput, userOrganizationId: string) {
    const { search, status, itemType, page, limit } = params;

    const where: Prisma.ItemWhereInput = {
      organizationId: userOrganizationId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { itemCode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = Array.isArray(status)
        ? { in: status as PrismaItemStatus[] }
        : (status as PrismaItemStatus);
    }
    if (itemType) {
      where.itemType = Array.isArray(itemType)
        ? { in: itemType as PrismaItemType[] }
        : (itemType as PrismaItemType);
    }

    const result = await itemRepository.getItems(where, { page, limit });
    return {
      data: result.data.map(mapToItem),
      meta: result.meta
    };
  },

  async getItemById(id: string, userOrganizationId: string): Promise<Item> {
    const item = await itemRepository.getItemById(id, userOrganizationId);
    if (!item) {
      throw AppError.resource.notFound("Item");
    }
    return mapToItem(item);
  },

  async createItem(
    data: CreateItemInput,
    userId: string,
    userOrganizationId: string,
  ): Promise<Item> {
    const { itemCode, itemType, hsnCode, sacCode, price, gstRate } = data;

    // Redundant non-negative validation for safety
    if (price < 0) throw AppError.validation.badRequest("Price cannot be negative");
    if (gstRate < 0) throw AppError.validation.badRequest("GST Rate cannot be negative");

    const normalizedItemType = itemType.toUpperCase() as PrismaItemType;

    // Plan limit: refuse once the org reaches its MAX_ITEMS ceiling.
    await assertWithinLimit(
      userOrganizationId,
      "MAX_ITEMS",
      billingRepository.countItems,
    );

    try {
      const item = await itemRepository.createItem({
        ...data,
        itemType: normalizedItemType,
        itemCode: itemCode?.toUpperCase(),
        hsnCode: normalizedItemType === PrismaItemType.GOODS ? hsnCode : null,
        sacCode: normalizedItemType === PrismaItemType.SERVICE ? sacCode : null,
        createdBy: { connect: { id: userId } },
        organization: { connect: { id: userOrganizationId } },
      });

      return mapToItem(item);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw AppError.resource.alreadyExists("Item", "itemCode");
      }
      throw error;
    }
  },

  async updateItem(
    id: string,
    data: UpdateItemInput,
    userOrganizationId: string,
  ): Promise<Item> {
    const existingItem = await itemRepository.getItemById(
      id,
      userOrganizationId,
    );
    if (!existingItem) {
      throw AppError.resource.notFound("Item");
    }

    if (data.price !== undefined && data.price < 0) {
      throw AppError.validation.badRequest("Price cannot be negative");
    }

    const normalizedItemType = data.itemType
      ? (data.itemType.toUpperCase() as PrismaItemType)
      : undefined;

    const normalizedData: Prisma.ItemUpdateInput = {
      ...data,
      itemType: normalizedItemType,
      ...(normalizedItemType === PrismaItemType.GOODS && {
        hsnCode: data.hsnCode,
        sacCode: null,
      }),
      ...(normalizedItemType === PrismaItemType.SERVICE && {
        hsnCode: null,
        sacCode: data.sacCode,
      }),
      status: data.status ? (data.status as PrismaItemStatus) : undefined,
    };

    try {
      const updated = await itemRepository.updateItem(id, normalizedData);
      return mapToItem(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw AppError.resource.alreadyExists("Item", "itemCode");
      }
      throw error;
    }
  },

  async toggleItemStatus(id: string, organizationId: string): Promise<Item> {
    const item = await itemRepository.getItemById(id, organizationId);
    if (!item) {
      throw AppError.resource.notFound("Item");
    }

    const newStatus =
      item.status === PrismaItemStatus.ACTIVE
        ? PrismaItemStatus.INACTIVE
        : PrismaItemStatus.ACTIVE;

    // Block deactivation when the item is referenced by existing quotations.
    if (
      item.status === PrismaItemStatus.ACTIVE &&
      (await itemRepository.isReferencedByQuotation(id, organizationId))
    ) {
      throw AppError.business.stateConflict(
        "This item is used in one or more quotations and cannot be deactivated. " +
          "Update or delete the affected quotations first.",
      );
    }

    const updated = await itemRepository.updateItemStatus(id, newStatus);
    return mapToItem(updated);
  },

  async deleteItem(id: string, userOrganizationId: string, userId: string) {
    const existingItem = await itemRepository.getItemById(
      id,
      userOrganizationId,
    );
    if (!existingItem) {
      throw AppError.resource.notFound("Item");
    }

    // Block deletion when the item is referenced by existing quotations.
    if (await itemRepository.isReferencedByQuotation(id, userOrganizationId)) {
      throw AppError.business.stateConflict(
        "This item is used in one or more quotations and cannot be deleted. " +
          "Update or delete the affected quotations first.",
      );
    }

    // Atomic soft-delete within a transaction for future-proofing (audit logs, etc)
    return await prisma.$transaction(async (tx: DB) => {
      await itemRepository.deleteItem(id, userId, tx);
    });
  },

  async getItemStats(organizationId: string) {
    return itemRepository.countStats(organizationId);
  },
};
