import { useCallback } from 'react';
import { useFetcher } from 'react-router-dom';
import { useRouterService } from '../RouterService';

export default function useNavigateToConvo() {
  const router = useRouterService();
  const fetcher = useFetcher();

  return useCallback(
    async (convoId: string) => {
      if (convoId === 'new') {
        router.navigateTo(`/c/new`);
        return;
      }

      fetcher.load(`/c/${convoId}`);

      if (fetcher.state === 'loading') {
        await new Promise<void>((resolve) => {
          const checkLoaded = () => {
            if (fetcher.state !== 'loading') {
              resolve();
            } else {
              setTimeout(checkLoaded, 50);
            }
          };
          checkLoaded();
        });
      }

      router.navigateTo(`/c/${convoId}`);
    },
    [router, fetcher],
  );
}
