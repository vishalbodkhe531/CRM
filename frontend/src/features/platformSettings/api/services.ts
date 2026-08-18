import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type {
  PlatformSettings,
  PublicPlatformSettings,
} from "@/contracts/types";
import { PLATFORM_SETTINGS_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

/**
 * Every field is optional and nullable where the model is: the form sends only
 * what changed, and null clears a value while absent leaves it alone.
 */
export interface PlatformSettingsPayload {
  platformName?: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  auditRetentionDays?: number | null;
  defaultPlanId?: string | null;
}

export const platformSettingsService = {
  getSettings: () =>
    service.get<PlatformSettings>(PLATFORM_SETTINGS_ENDPOINTS.SETTINGS),

  getPublicSettings: () =>
    service.get<PublicPlatformSettings>(PLATFORM_SETTINGS_ENDPOINTS.PUBLIC),

  updateSettings: (payload: PlatformSettingsPayload) =>
    service.patch<PlatformSettings, PlatformSettingsPayload>(
      PLATFORM_SETTINGS_ENDPOINTS.SETTINGS,
      payload,
    ),
};
