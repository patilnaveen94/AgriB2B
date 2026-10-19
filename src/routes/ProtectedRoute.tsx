import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import { FullScreenLoader } from '@/components/ui/Loader';

interface ProtectedRouteProps {
  /** If provided, the signed-in user's role must be in this list. */
  allow?: UserRole[];
}

/**
 * Guards nested routes. Redirects unauthenticated users to /login and
 * role-mismatched users to their home dashboard.
 */
export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader label="Loading your workspace…" />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allow && role && !allow.includes(role)) {
    const home = role === 'retailer' ? '/app' : '/admin';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}

/** Convenience wrapper for the retailer portal. */
export function RetailerRoute() {
  return <ProtectedRoute allow={['retailer']} />;
}

/** Convenience wrapper for the staff/admin console. */
export function StaffRoute() {
  return <ProtectedRoute allow={['staff', 'super_admin']} />;
}

/** Super-admin-only wrapper. */
export function AdminOnlyRoute() {
  return <ProtectedRoute allow={['super_admin']} />;
}
