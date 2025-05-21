import { useEffect } from 'react';
import { useRouterService } from './RouterService';
import { useAuthContext } from '~/hooks';

export default function useAuthRedirect() {
  const { user, isAuthenticated } = useAuthContext();
  const router = useRouterService();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isAuthenticated) {
        const currentPath = router.getCurrentPath();
        if (!currentPath.includes('/login')) {
          router.navigateTo('/login', { replace: true });
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [isAuthenticated, router]);

  return {
    user,
    isAuthenticated,
  };
}
