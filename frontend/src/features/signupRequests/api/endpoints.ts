export const SIGNUP_REQUEST_ENDPOINTS = {
  LIST: "/admin/signup-requests",
  DETAIL: (id: string) => `/admin/signup-requests/${id}`,
  UPDATE_STATUS: (id: string) => `/admin/signup-requests/${id}/status`,
};
