// reducer
export { default as authReducer } from "./store/slice";

// actions
export { clearAuth, setSelectedOrganizationId } from "./store/slice";

// ✅ thunks (ADD THIS)
export {
  bootstrapAuth,
  login,
  signup,
  logout,
  updateProfile,
  changePassword,
} from "./store/slice";

// selectors
export {
  selectCurrentUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectUserRole,
  selectSelectedOrganizationId,
} from "./store/selectors";

// hooks
export { useAuthBootstrap } from "./hooks/useAuthBootstrap";
export { usePermissions } from "./hooks/usePermissions";
export { useAuth } from "./hooks/useAuth";

// types
export type { AuthUser } from "./types";

// components
export { default as LoginForm } from "./components/forms/LoginForm";
export { default as SignUpForm } from "./components/forms/SignUpForm";
export { default as ProfileLayoutView } from "./components/view/ProfileLayoutView";
export { default as PersonalInfoForm } from "./components/forms/PersonalInfoForm";
export { default as ChangePasswordFormView } from "./components/forms/ChangePasswordForm";
