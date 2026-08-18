/**
 * In-memory token storage to prevent XSS exposure
 * This will be reset on page refresh, triggering the 401 refresh flow
 */
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => {
  return accessToken;
};

export const clearAccessToken = () => {
  accessToken = null;
};
