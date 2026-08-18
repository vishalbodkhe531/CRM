export const LEAD_ENDPOINTS = {
  CREATE: "/leads",
  LIST: "/leads",
  GET: (id: string) => `/leads/${id}`,
  UPDATE: (id: string) => `/leads/${id}`,
  UPDATE_STATUS: (id: string) => `/leads/${id}/status`,
  DELETE: (id: string) => `/leads/${id}`,
  CONVERT: (id: string) => `/leads/${id}/convert`,
  ASSIGN: (id: string) => `/leads/${id}/assign`,
  IMPORT: "/leads/import",
  ASSIGNABLE_USERS: "/leads/assignable-users",
};
