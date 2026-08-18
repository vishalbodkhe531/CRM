import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosInstance,
} from "axios";
import type { ApiResponse } from "@/types/api";
import { authChannel, getAccessToken, setAccessToken } from "./auth";

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type FailedQueueItem = {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
};

type SyncMessage = 
  | { type: "REFRESH_STARTED" }
  | { type: "REFRESH_SUCCESS"; payload: { accessToken: string } }
  | { type: "REFRESH_FAILURE"; payload: { error?: string } }
  | { type: "LOGOUT" };


// ================= MODULE STATE =================

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Modular Setup function to bridge API with App state.
 * Crucially, this does NOT import the store, avoiding circular dependencies.
 */
export const setupInterceptors = (
  apiInstance: AxiosInstance,
  options: {
    getSelectedOrgId: () => string | null;
    getIsSuperAdmin: () => boolean;
    onAuthCleared: () => void;
    /** Called when the server refuses a write because the subscription lapsed. */
    onSubscriptionRequired: (message: string) => void;
  },
) => {
  const {
    getSelectedOrgId,
    getIsSuperAdmin,
    onAuthCleared,
    onSubscriptionRequired,
  } = options;

  // ================= TAB SYNC LISTENER =================

  authChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
    const message = event.data;

    switch (message.type) {
      case "REFRESH_STARTED":
        isRefreshing = true;
        break;

      case "REFRESH_SUCCESS":
        isRefreshing = false;
        processQueue(null, message.payload.accessToken);
        break;

      case "REFRESH_FAILURE":
        isRefreshing = false;
        processQueue(
          message.payload.error || new Error("Refresh failed in another tab"),
        );
        onAuthCleared();
        break;

      case "LOGOUT":
        onAuthCleared();
        break;
    }
  };

  // ================= REQUEST INTERCEPTOR =================

  apiInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Directly use tokenStore (via auth.ts) - no store dependency!
    const token = getAccessToken();

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    const writeMethods = ["post", "put", "patch", "delete"];
    if (config.method && writeMethods.includes(config.method.toLowerCase())) {
      config.headers.set("x-requested-with", "XMLHttpRequest");
    }

    const selectedOrgId = getSelectedOrgId();
    const isSuperAdmin = getIsSuperAdmin();

    if (isSuperAdmin && selectedOrgId) {
      config.headers.set("x-organization-id", selectedOrgId);
    } else {
      config.headers.delete("x-organization-id");
    }

    return config;
  });

  // ================= RESPONSE INTERCEPTOR =================

  apiInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiResponse<unknown>>) => {
      const originalRequest = error.config as RetryableRequestConfig | undefined;
      if (!originalRequest) return Promise.reject(error);

      const requestUrl = String(originalRequest.url ?? "");
      const isLoginRequest = requestUrl.includes("/auth/login");
      const isRefreshRequest = requestUrl.includes("/auth/refresh");

      /*
       * Handle 402 Payment Required — the subscription has lapsed.
       *
       * Surfaced here rather than in each feature's onError so the message is
       * identical everywhere and no mutation can fail silently. The server
       * builds the wording from resolveSubscriptionState, so what the user reads
       * always matches the rule that actually blocked them.
       *
       * The request is NOT retried: unlike a 401 there is nothing the client can
       * refresh. Only the persistent banner and the billing page resolve it.
       */
      if (error.response?.status === 402) {
        onSubscriptionRequired(
          error.response.data?.message ??
            "Your subscription has lapsed. Renew to continue making changes.",
        );
        return Promise.reject(error);
      }

      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        if (originalRequest._retry || isLoginRequest || isRefreshRequest) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (!token) {
                return Promise.reject(new Error("Missing refreshed access token"));
              }
              originalRequest.headers.set("Authorization", `Bearer ${token as string}`);
              return apiInstance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        authChannel.postMessage({ type: "REFRESH_STARTED" });

        try {
          const apiBaseUrl = (apiInstance.defaults.baseURL || "").replace(/\/+$/, "");
          const res = await axios.post<ApiResponse<{ accessToken: string }>>(
            `${apiBaseUrl}/auth/refresh`,
            {},
            {
              withCredentials: true,
              timeout: 8000,
              headers: {
                "x-requested-with": "XMLHttpRequest",
              },
            },
          );

          const { accessToken } = res.data.data;

          setAccessToken(accessToken);
          isRefreshing = false;

          authChannel.postMessage({
            type: "REFRESH_SUCCESS",
            payload: { accessToken },
          });

          processQueue(null, accessToken);

          originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
          return apiInstance(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;

          authChannel.postMessage({
            type: "REFRESH_FAILURE",
            payload: { error: "Session expired" },
          });

          processQueue(refreshError, null);
          onAuthCleared();

          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    },
  );
};
