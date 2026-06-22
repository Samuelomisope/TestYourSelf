import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import ThemeToggle from "./components/ThemeToggle.jsx"; // adjust path to match where you saved it

function ProtectedRoute({ children }) {
  const { user, emailVerified } = useAuth();
  const location = useLocation();

  if (user === undefined) return null;

  if (!user) return <Navigate to="/" state={{ from: location }} replace />;
  if (!emailVerified) return <Navigate to="/verify-email" />;

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50">
        <ThemeToggle />
      </div>
    </>
  );
}
export default ProtectedRoute;