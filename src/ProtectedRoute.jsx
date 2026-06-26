import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) return null;
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;

  return children;
}

export default ProtectedRoute;