import React from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Profile } from '@/types'; // Assuming Profile type includes a 'role'

interface RoleBasedGuardProps {
  allowedRoles: Array<Profile['role']>; // Array of allowed roles
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional fallback UI if not authorized
}

export const RoleBasedGuard: React.FC<RoleBasedGuardProps> = ({ allowedRoles, children, fallback }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // You might want a loading spinner or some placeholder here
    return <div className="flex justify-center items-center h-screen">Loading authentication status...</div>;
  }

  if (!user) {
    // User is not logged in, handle as unauthorized or redirect to login
    // For now, rendering fallback or null. A redirect might be better in a real app.
    return <>{fallback || <div className="flex justify-center items-center h-screen">Access Denied: Not Logged In.</div>}</>;
  }

  // Ensure user.role is not null or undefined before checking
  const userRole = user.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    // User does not have an allowed role
    return <>{fallback || <div className="flex justify-center items-center h-screen">Access Denied: You do not have the required permissions.</div>}</>;
  }

  // User has an allowed role, render the children
  return <>{children}</>;
};
