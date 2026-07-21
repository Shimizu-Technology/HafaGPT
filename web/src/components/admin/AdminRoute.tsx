import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoaded } = useUser();
  
  // Show loading while auth is being checked
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-4" />
          <p className="text-brown-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Check if user is signed in
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  // Check if user has admin role
  const isAdmin = user.publicMetadata?.role === 'admin';
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl border border-cream-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-brown-800 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-brown-600 dark:text-gray-400 mb-6">
            You don't have permission to access the admin dashboard. 
            This area is restricted to administrators only.
          </p>
          <a 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-coral-500 dark:bg-ocean-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

export default AdminRoute;

