import { configureStore } from "@reduxjs/toolkit";
import { authReducer, clearAuth } from "@/features/auth";
import { toastListenerMiddleware } from "@/app/toastListenerMiddleware";
import { queryClient } from "@/app/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { showError } from "@/utils/toast";
import api from "@/lib/api/client";
import { setupInterceptors } from "@/lib/api/interceptors";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(toastListenerMiddleware.middleware),
});

/**
 * Throttle the lapsed-subscription toast.
 *
 * A single screen can fire several mutations at once, and a page full of
 * identical "subscription lapsed" toasts buries the banner that actually
 * explains what to do.
 */
const SUBSCRIPTION_TOAST_INTERVAL_MS = 10_000;
let lastSubscriptionToastAt = 0;

// Setup API Interceptors with decoupled callbacks
setupInterceptors(api, {
  getSelectedOrgId: () => store.getState().auth.selectedOrganizationId,
  getIsSuperAdmin: () => store.getState().auth.user?.role === "SUPER_ADMIN",
  onAuthCleared: () => {
    store.dispatch(clearAuth());
  },
  onSubscriptionRequired: (message) => {
    const now = Date.now();
    if (now - lastSubscriptionToastAt > SUBSCRIPTION_TOAST_INTERVAL_MS) {
      lastSubscriptionToastAt = now;
      showError(message);
    }

    // Refetch the subscription so the banner reflects reality immediately.
    // Without this the user sees a rejection with no persistent explanation
    // until the next natural refetch.
    void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
  },
});
