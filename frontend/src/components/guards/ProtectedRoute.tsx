import { Navigate, Outlet } from "react-router-dom";
import GuardLoading from "@/components/guards/GuardLoading";
import { useAppSelector } from "@/hooks/useRedux";

/**
 * Gate for everything behind authentication.
 *
 * This used to also rewrite every tenant URL to insert the user's organization
 * slug. That rewriting is gone along with the `/:orgSlug/*` routes — and with it
 * a redirect loop: the guard skipped rewriting for paths starting `/admin`,
 * while the rewriter itself skipped `/admin` AND `/super-admin`. A tenant user
 * who opened a `/super-admin/*` URL therefore passed the guard's check, was sent
 * to the rewriter, got the identical path back, and redirected to where it
 * already was, forever. Now such a user simply falls through to RoleGuard and
 * gets a clean refusal.
 */
const ProtectedRoute = () => {
  const { user, loading } = useAppSelector((state) => state.auth);

  if (loading) {
    return <GuardLoading />;
  }

  // A user is considered authenticated if user exists in the store
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
