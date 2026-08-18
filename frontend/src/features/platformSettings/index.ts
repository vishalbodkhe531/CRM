// Platform Settings Feature Barrel Exports

// Hooks
export {
  usePlatformSettings,
  usePublicPlatformSettings,
  useUpdatePlatformSettings,
} from "./hooks/usePlatformSettings";

// Services
export { platformSettingsService } from "./api/services";
export type { PlatformSettingsPayload } from "./api/services";

// Components
export { default as PlatformSettingsView } from "./components/view/PlatformSettingsView";
