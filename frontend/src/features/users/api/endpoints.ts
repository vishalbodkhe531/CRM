export const USER_ENDPOINTS = {
  LIST: "/users",
  CREATE: "/users",
  DETAIL: (id: string) => `/users/${id}`,
  UPDATE: (id: string) => `/users/${id}`,
  ENABLE: (id: string) => `/users/${id}/enable`,
  DISABLE: (id: string) => `/users/${id}/disable`,
  DELETE: (id: string) => `/users/${id}`,
  RESET_PASSWORD: (id: string) => `/users/${id}/reset-password`,
};
