import { Prisma } from "@prisma/client";
import { prisma, DB } from "../../config/db";

/**
 * The one row's primary key.
 *
 * A fixed key rather than a uuid is what makes the table a singleton: every
 * reader and writer addresses the same record by name, so there is no "which
 * settings row is the real one" question to get wrong.
 */
export const PLATFORM_SETTINGS_ID = "platform";

const settingsInclude = {
  defaultPlan: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PlatformSettingInclude;

export type PlatformSettingWithRelations = Prisma.PlatformSettingGetPayload<{
  include: typeof settingsInclude;
}>;

export const platformSettingsRepository = {
  /**
   * Reads the singleton, creating it on first access.
   *
   * The migration seeds the row, so this upsert is a safety net for databases
   * restored from an older dump — it keeps every caller free of null handling.
   */
  get: async (tx?: DB): Promise<PlatformSettingWithRelations> => {
    const db = tx || prisma;

    return db.platformSetting.upsert({
      where: { id: PLATFORM_SETTINGS_ID },
      update: {},
      create: { id: PLATFORM_SETTINGS_ID },
      include: settingsInclude,
    });
  },

  update: async (
    data: Prisma.PlatformSettingUpdateInput,
    tx?: DB,
  ): Promise<PlatformSettingWithRelations> => {
    const db = tx || prisma;

    return db.platformSetting.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data,
      include: settingsInclude,
    });
  },
};
