import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute component to restrict access to authenticated users only
 * Redirects to login page if user is not authenticated
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated, isAdmin, isOwner } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for required role if specified
  if (requiredRole) {
    if (requiredRole === 'admin' && !isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
    
    if ((requiredRole === 'owner' || requiredRole === 'charger_owner') && !isOwner) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and has required role, render the protected component
  return children;
};

export default ProtectedRoute;
