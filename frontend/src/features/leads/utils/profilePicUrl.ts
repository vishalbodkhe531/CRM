import { resolveAssetUrl } from "@/utils/assetUrl";

export const getProfilePicUrl = (url: string | null | undefined): string | null => {
  return resolveAssetUrl(url);
};
