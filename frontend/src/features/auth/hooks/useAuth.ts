import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { login, logout, fetchMe } from "../store/slice";
import { selectAuthError, selectAuthLoading, selectCurrentUser } from "../store/selectors";
import { useCallback } from "react";
import { LoginInput } from "@/contracts/validation";

/**
 * Standardized Auth hook to provide a consistent interface for Auth state and actions.
 * Simplifies migration and ensures UI patterns (loading/error) are predictable.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  const handleLogin = useCallback(async (values: LoginInput) => {
    return await dispatch(login(values)).unwrap();
  }, [dispatch]);

  const handleLogout = useCallback(async () => {
    return await dispatch(logout()).unwrap();
  }, [dispatch]);

  const refreshSession = useCallback(async () => {
    return await dispatch(fetchMe()).unwrap();
  }, [dispatch]);

  return {
    user,
    isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
    refreshSession,
    isAuthenticated: !!user,
  };
}
