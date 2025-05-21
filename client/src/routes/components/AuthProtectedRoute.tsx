import React, { ReactNode, useEffect } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';
import { useRouterService } from '../RouterService';

interface AuthProtectedRouteProps {
  children: ReactNode;
}

export default function AuthProtectedRoute({ children }: AuthProtectedRouteProps) {
  const { isAuthenticated } = useAuthContext();
  const router = useRouterService();

  useEffect(() => {
    if (!isAuthenticated) {
      const currentPath = router.getCurrentPath();
      const searchParams = router.getSearchParams().toString();
      const redirectTo = searchParams ? `${currentPath}?${searchParams}` : currentPath;
      router.navigateTo(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true });
    }
  }, [isAuthenticated, router]);

  return isAuthenticated ? <>{children}</> : null;
}
