export const ORGANIZATION_ENDPOINTS = {
  LIST: "/organizations",
  CREATE: "/organizations",
  BY_SLUG: (slug: string) => `/organizations/by-slug/${slug}`,
  DETAIL: (id: string) => `/organizations/${id}`,
  UPDATE_STATUS: (id: string) => `/organizations/${id}/status`,
  ARCHIVE: (id: string) => `/organizations/${id}`,
  RESTORE: (id: string) => `/organizations/${id}/restore`,
};
