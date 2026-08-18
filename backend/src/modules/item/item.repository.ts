import { Prisma, ItemStatus } from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { paginate } from "../../utils/db/paginate";

const ACTIVE_FILTER = { deletedAt: null };

export const itemRepository = {
  async findItemByCode(itemCode: string, organizationId?: string, tx?: DB) {
    const db = tx || prisma;
    const where: Prisma.ItemWhereInput = {
      itemCode,
      ...ACTIVE_FILTER,
      ...(organizationId ? { organizationId } : {}),
    };
    return db.item.findFirst({ where });
  },

  async findDuplicateItemCode(id: string, itemCode: string, organizationId?: string, tx?: DB) {
    const db = tx || prisma;
    const where: Prisma.ItemWhereInput = {
      id: { not: id },
      itemCode,
      ...ACTIVE_FILTER,
      ...(organizationId ? { organizationId } : {}),
    };

    return db.item.findFirst({
      where,
      select: { id: true },
    });
  },

  async getItems(
    where: Prisma.ItemWhereInput,
    options: { page: number; limit: number },
    tx?: DB,
  ) {
    const db = tx || prisma;
    const finalWhere: Prisma.ItemWhereInput = {
      ...where,
      ...ACTIVE_FILTER,
    };

    return paginate(
      db.item,
      finalWhere,
      options,
      db,
      {
        orderBy: { createdAt: "desc" },
      }
    );
  },

  async getItemById(id: string, organizationId?: string, tx?: DB) {
    const db = tx || prisma;
    const where: Prisma.ItemWhereInput = { 
      id, 
      ...ACTIVE_FILTER 
    };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    
    // We use findFirst since findUnique doesn't support complex where (with deletedAt: null) without composite keys
    return db.item.findFirst({ where });
  },

  async findActiveItemById(id: string, organizationId: string, tx?: DB) {
    const db = tx || prisma;
    return db.item.findFirst({
      where: {
        id,
        organizationId,
        status: ItemStatus.ACTIVE,
        ...ACTIVE_FILTER,
      },
    });
  },

  async findActiveItemsByIds(ids: string[], organizationId: string, tx?: DB) {
    const db = tx || prisma;
    return db.item.findMany({
      where: {
        id: { in: ids },
        organizationId,
        status: ItemStatus.ACTIVE,
        ...ACTIVE_FILTER,
      },
      select: {
        id: true,
        name: true,
        hsnCode: true,
        sacCode: true,
      },
    });
  },

  async createItem(data: Prisma.ItemCreateInput, tx?: DB) {
    const db = tx || prisma;
    return db.item.create({ data });
  },

  async updateItem(id: string, data: Prisma.ItemUpdateInput, tx?: DB) {
    const db = tx || prisma;
    return db.item.update({
      where: { id },
      data,
    });
  },

  async updateItemStatus(id: string, status: ItemStatus, tx?: DB) {
    const db = tx || prisma;
    return db.item.update({
      where: { id },
      data: { status },
    });
  },

  /**
   * Soft Delete - Marks the item as deleted instead of removing it from the database.
   * Ensures referential integrity for Leads/Quotes.
   */
  async deleteItem(id: string, userId: string, tx?: DB) {
    const db = tx || prisma;
    return db.item.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  },

  /**
   * Counts total, active, and inactive (soft-deleted excluded) items
   * for the organisation, used by the stats endpoint.
   */
  async countStats(organizationId: string, tx?: DB) {
    const db = tx || prisma;
    const [total, active, goods, services] = await Promise.all([
      db.item.count({
        where: { organizationId, deletedAt: null },
      }),
      db.item.count({
        where: { organizationId, deletedAt: null, status: ItemStatus.ACTIVE },
      }),
      db.item.count({
        where: { organizationId, deletedAt: null, itemType: "GOODS" },
      }),
      db.item.count({
        where: { organizationId, deletedAt: null, itemType: "SERVICE" },
      }),
    ]);
    return { total, active, inactive: total - active, goods, services };
  },

  /**
   * Returns true when at least one non-deleted quotation in the organisation
   * references this item inside its `details.items` JSON array.
   *
   * The check uses a Postgres jsonb path query so it works without loading
   * full quotation payloads into memory.
   */
  async isReferencedByQuotation(
    itemId: string,
    organizationId: string,
    tx?: DB,
  ): Promise<boolean> {
    const db = tx || prisma;
    const result = await (db as any).$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM "Quotation" q
        WHERE q."organizationId" = ${organizationId}
          AND q."deletedAt" IS NULL
          AND q."details" @> jsonb_build_object(
            'items', jsonb_build_array(jsonb_build_object('itemId', ${itemId}::text))
          )::jsonb
      ) AS "exists"
    `;
    return result[0]?.exists ?? false;
  },
};
