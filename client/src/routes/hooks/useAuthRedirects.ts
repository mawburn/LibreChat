import { useCallback } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';
import { useRouterService } from '../RouterService';

export default function useAuthRedirects() {
  const router = useRouterService();
  const { logout: authLogout } = useAuthContext();

  const redirectAfterLogin = useCallback(
    (redirectUrl: string) => {
      if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
        router.navigateExternal(redirectUrl);
      } else {
        router.navigateTo(redirectUrl, { replace: true });
      }
    },
    [router],
  );

  const logout = useCallback(
    (redirectPath?: string) => {
      authLogout(redirectPath || '/login');
    },
    [authLogout],
  );

  return {
    redirectAfterLogin,
    logout,
  };
}
