import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

interface AdminRouteProps {
  children?: React.ReactNode; // Allow wrapping components directly if needed
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Show a loading indicator while auth state is being determined
    // You can customize this further
    return (
      <div className="p-4">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  // If not loading, check user and role
  if (!user || user.role !== 'admin') {
    // Redirect non-admins to the dashboard (or a specific unauthorized page)
    console.warn('Access denied: User is not an admin.');
    return <Navigate to="/" replace />;
  }

  // If user is admin, render the child routes/component
  return children ? <>{children}</> : <Outlet />; // Render children or Outlet for nested routes
};

export default AdminRoute;
