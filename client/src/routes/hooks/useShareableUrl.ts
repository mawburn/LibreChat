import { useCallback } from 'react';
import { useRouterService } from '../RouterService';

export default function useShareableUrl() {
  const router = useRouterService();

  return useCallback(
    (path: string) => {
      return router.buildShareableUrl(path);
    },
    [router],
  );
}
