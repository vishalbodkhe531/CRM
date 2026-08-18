export const PROSPECT_ENDPOINTS = {
  LIST: "/prospects",
  GET: (id: string) => `/prospects/${id}`,
  UPDATE: (id: string) => `/prospects/${id}`,
  UPDATE_STAGE: (id: string) => `/prospects/${id}/stage`,
  UPDATE_FOLLOW_UP: (id: string) => `/prospects/${id}/follow-up`,
  CREATE_ACTIVITY: (id: string) => `/prospects/${id}/activities`,
  DELETE: (id: string) => `/prospects/${id}`,
};
