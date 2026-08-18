import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store/types";

const selectAuthState = (state: RootState) => state.auth;

export const selectCurrentUser = createSelector(
  [selectAuthState],
  (auth) => auth.user,
);

export const selectIsAuthenticated = createSelector(
  [selectCurrentUser],
  (user) => !!user,
);

export const selectAuthLoading = createSelector(
  [selectAuthState],
  (auth) => auth.loading,
);

export const selectAuthError = createSelector(
  [selectAuthState],
  (auth) => auth.error,
);

export const selectUserRole = createSelector(
  [selectCurrentUser],
  (user) => user?.role,
);

export const selectSelectedOrganizationId = createSelector(
  [selectAuthState],
  (auth) => auth.selectedOrganizationId,
);
