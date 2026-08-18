import axios from "axios";

const DEV_FALLBACK_API_BASE_URL = "http://localhost:5000/api/v1";
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const resolvedApiBaseUrl =
  configuredApiBaseUrl ||
  (import.meta.env.DEV ? DEV_FALLBACK_API_BASE_URL : "");

if (!resolvedApiBaseUrl) {
  throw new Error("Missing VITE_API_BASE_URL");
}

const apiBaseUrl = resolvedApiBaseUrl.replace(/\/+$/, "");

/**
 * PURE Axios instance with zero global state.
 * All interceptors are added via setupInterceptors in the app layer.
 */
export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  paramsSerializer: {
    // Send arrays as repeated keys (`status=A&status=B`) instead of bracket keys (`status[]=A`)
    // so Express simple query parsing + backend schemas can parse them correctly.
    indexes: null,
  },
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 90000,
});

export default api;
