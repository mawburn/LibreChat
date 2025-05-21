import React, { ReactNode, useEffect } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';
import { useRouterService } from '../RouterService';

interface AuthProtectedRouteProps {
  children: ReactNode;
}

/**
 * Component to protect routes that require authentication
 * Using RouterService instead of direct React Router navigation
 */
export default function AuthProtectedRoute({ children }: AuthProtectedRouteProps) {
  const { isAuthenticated } = useAuthContext();
  const router = useRouterService();
  
  useEffect(() => {
    if (!isAuthenticated) {
      // Store the current path for after-login redirect
      const currentPath = router.getCurrentPath();
      const searchParams = router.getSearchParams().toString();
      const redirectTo = searchParams ? `${currentPath}?${searchParams}` : currentPath;
      router.navigateTo(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true });
    }
  }, [isAuthenticated, router]);
  
  return isAuthenticated ? <>{children}</> : null;
}