import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "../lib/auth";

/**
 * Wraps pages that need a login. Anyone without a valid session is sent to /login, and
 * `state.from` remembers where they were going so the login page can send them back.
 */
export default function RequireAuth({ children }) {
  const location = useLocation();

  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
