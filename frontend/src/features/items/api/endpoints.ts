export const ITEM_ENDPOINTS = {
  LIST: "/items",
  STATS: "/items/stats",
  CREATE: "/items",
  GET: (id: string) => `/items/${id}`,
  UPDATE: (id: string) => `/items/${id}`,
  DELETE: (id: string) => `/items/${id}`,
  TOGGLE_STATUS: (id: string) => `/items/${id}/toggle-status`,
};
