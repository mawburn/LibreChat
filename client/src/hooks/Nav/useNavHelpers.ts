import { useCallback, useEffect, useRef } from 'react';
import type { Location } from 'react-router-dom';
import { useRouterService } from '~/routes/RouterService';

export function useCustomLink<T = HTMLAnchorElement>(
  route: string,
  callback?: (event: React.MouseEvent<T>) => void,
) {
  const router = useRouterService();
  const clickHandler = useCallback(
    (event: React.MouseEvent<T>) => {
      if (callback) {
        callback(event);
      }
      if (event.button === 0 && !(event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        const currentLocation = router.getCurrentLocation();
        router.navigateTo(route, { state: { prevLocation: currentLocation } });
      }
    },
    [router, route, callback],
  );
  return clickHandler;
}

export const usePreviousLocation = () => {
  const router = useRouterService();
  const location = router.getCurrentLocation();
  const previousLocationRef: React.MutableRefObject<Location<unknown> | undefined> = useRef();

  useEffect(() => {
    previousLocationRef.current = location.state?.prevLocation;
  }, [location]);

  return previousLocationRef;
};
