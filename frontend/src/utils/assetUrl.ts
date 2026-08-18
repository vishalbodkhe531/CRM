const getBackendOrigin = () => {
  return import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace("/api/v1", "").replace(/\/$/, "")
    : "http://localhost:5000";
};

export const resolveAssetUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return `${getBackendOrigin()}${url.startsWith("/") ? url : `/${url}`}`;
};
