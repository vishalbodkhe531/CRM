import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { queryClient } from "@/app/queryClient";
import {
  clearAuth,
  login,
  signup,
  logout,
  updateProfile,
  changePassword,
} from "@/features/auth";
import { showError, showSuccess } from "@/utils/toast";

const getRejectMessage = (
  payload: unknown,
  fallbackMessage: string,
): string => {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }
  if (typeof payload === "object" && payload !== null) {
    const message = Reflect.get(payload, "message");
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallbackMessage;
};

export const toastListenerMiddleware = createListenerMiddleware();

toastListenerMiddleware.startListening({
  actionCreator: clearAuth,
  effect: () => {
    queryClient.clear();
  },
});

toastListenerMiddleware.startListening({
  matcher: isAnyOf(
    login.fulfilled,
    login.rejected,
    signup.fulfilled,
    signup.rejected,
  ),
  effect: (action) => {
    if (login.fulfilled.match(action)) {
      queryClient.clear();
      showSuccess("Welcome back!");
      return;
    }
    if (signup.fulfilled.match(action)) {
      queryClient.clear();
      showSuccess("Account created successfully");
      return;
    }
    if (signup.rejected.match(action)) {
      showError(getRejectMessage(action.payload, "Signup failed"));
      return;
    }
    showError(getRejectMessage(action.payload, "Login failed"));
  },
});

toastListenerMiddleware.startListening({
  matcher: isAnyOf(logout.fulfilled, logout.rejected),
  effect: () => {
    showSuccess("Logged out successfully");
  },
});

toastListenerMiddleware.startListening({
  matcher: isAnyOf(updateProfile.fulfilled, changePassword.fulfilled),
  effect: (action) => {
    if (updateProfile.fulfilled.match(action)) {
      showSuccess("Profile updated successfully");
      return;
    }
    queryClient.clear();
    showSuccess("Password updated. Please login again");
  },
});

toastListenerMiddleware.startListening({
  matcher: isAnyOf(updateProfile.rejected, changePassword.rejected),
  effect: (action) => {
    if (updateProfile.rejected.match(action)) {
      showError(getRejectMessage(action.payload, "Failed to update profile"));
      return;
    }
    showError(getRejectMessage(action.payload, "Failed to change password"));
  },
});
