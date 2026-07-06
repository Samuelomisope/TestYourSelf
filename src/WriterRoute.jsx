import { useAuth } from "./useAuth";
import { Navigate } from "react-router-dom";

function WriterRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // AuthProvider already delays render until !loading, but safe to guard anyway

  if (!user?.isWriter) {
    return <Navigate to="/novels/become-writer" replace />;
  }

  return children;
}

export default WriterRoute;