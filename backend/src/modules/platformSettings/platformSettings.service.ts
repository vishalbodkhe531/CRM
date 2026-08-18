import { AppError } from "../../utils/errors/appError";
import { billingRepository } from "../billing/billing.repository";
import {
  platformSettingsRepository,
  type PlatformSettingWithRelations,
} from "./platformSettings.repository";
import type {
  PlatformSettings,
  PublicPlatformSettings,
} from "../../contracts/types";
import type { UpdatePlatformSettingsInput } from "../../contracts/validation";

const mapToContract = (
  row: PlatformSettingWithRelations,
): PlatformSettings => ({
  platformName: row.platformName,
  supportEmail: row.supportEmail,
  supportPhone: row.supportPhone,
  auditRetentionDays: row.auditRetentionDays,
  defaultPlanId: row.defaultPlanId,
  defaultPlanName: row.defaultPlan?.name ?? null,
  updatedAt: row.updatedAt.toISOString(),
  updatedBy: row.updatedBy
    ? {
        id: row.updatedBy.id,
        name: `${row.updatedBy.firstName} ${row.updatedBy.lastName}`.trim(),
      }
    : null,
});

export const platformSettingsService = {
  async getSettings(): Promise<PlatformSettings> {
    return mapToContract(await platformSettingsRepository.get());
  },

  /**
   * The slice any authenticated user may read.
   *
   * Deliberately a separate method rather than a filter over getSettings, so
   * adding a genuinely sensitive field later cannot leak it to tenants by
   * default — a new field has to be added here on purpose.
   */
  async getPublicSettings(): Promise<PublicPlatformSettings> {
    const row = await platformSettingsRepository.get();

    return {
      platformName: row.platformName,
      supportEmail: row.supportEmail,
      supportPhone: row.supportPhone,
    };
  },

  async updateSettings(
    input: UpdatePlatformSettingsInput,
    actorId: string,
  ): Promise<PlatformSettings> {
    /**
     * A default plan new organizations land on must actually be assignable.
     * Pointing it at a retired plan would break org creation later, far from
     * the change that caused it.
     */
    if (input.defaultPlanId) {
      const plan = await billingRepository.findPlanById(input.defaultPlanId);

      if (!plan) {
        throw AppError.resource.notFound("Plan", input.defaultPlanId);
      }

      if (!plan.isActive) {
        throw AppError.validation.badRequest(
          "A retired plan cannot be the default for new organizations",
        );
      }
    }

    const updated = await platformSettingsRepository.update({
      ...(input.platformName !== undefined
        ? { platformName: input.platformName }
        : {}),
      ...(input.supportEmail !== undefined
        ? { supportEmail: input.supportEmail }
        : {}),
      ...(input.supportPhone !== undefined
        ? { supportPhone: input.supportPhone }
        : {}),
      ...(input.auditRetentionDays !== undefined
        ? { auditRetentionDays: input.auditRetentionDays }
        : {}),
      ...(input.defaultPlanId !== undefined
        ? {
            defaultPlan: input.defaultPlanId
              ? { connect: { id: input.defaultPlanId } }
              : { disconnect: true },
          }
        : {}),
      updatedBy: { connect: { id: actorId } },
    });

    return mapToContract(updated);
  },
};
