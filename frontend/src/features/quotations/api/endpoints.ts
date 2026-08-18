export const QUOTATION_ENDPOINTS = {
  LIST: "/quotations",
  STATS: "/quotations/stats",
  CREATE: "/quotations",
  GET: (id: string) => `/quotations/${id}`,
  UPDATE: (id: string) => `/quotations/${id}`,
  DELETE: (id: string) => `/quotations/${id}`,
};
