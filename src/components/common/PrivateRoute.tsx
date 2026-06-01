import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { SkeletonAppLoader } from "../ui/skeleton/Skeleton";

interface PrivateRouteProps {
  requiredRoles?: string[];
  requireOnboarding?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  requiredRoles,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <SkeletonAppLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (user?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRole = requiredRoles.some(
      (r) => user?.roles.includes(r) || (r === "Aegis" && user?.isAegisUser),
    );
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default PrivateRoute;
