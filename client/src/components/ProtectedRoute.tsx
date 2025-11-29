import { Navigate } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuth, UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allow: UserRole[];
  element: ReactElement;
}

const ProtectedRoute = ({ allow, element }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-xl text-neutral-800">در حال بررسی دسترسی...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin' || allow.includes(user.role)) {
    return element;
  }

  return <Navigate to="/dashboard" replace />;
};

export default ProtectedRoute;


