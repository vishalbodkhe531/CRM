import { Navigate } from "react-router-dom";

import GuardLoading from "@/components/guards/GuardLoading";
import { useAppSelector } from "@/hooks/useRedux";
import LoginPage from "@/pages/LoginPage";
import { DEFAULT_AUTHENTICATED_PATH } from "@/utils/orgRoutes";

const AuthEntryRoute = () => {
  const { user, loading } = useAppSelector((state) => state.auth);

  if (loading) {
    return <GuardLoading />;
  }

  if (user) {
    return <Navigate to={DEFAULT_AUTHENTICATED_PATH} replace />;
  }

  return <LoginPage />;
};

export default AuthEntryRoute;
