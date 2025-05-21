import { useEffect } from 'react';
import { useRouterService } from '~/routes/RouterService';
import { logger } from '~/utils';

export default function useFocusChatEffect(textAreaRef: React.RefObject<HTMLTextAreaElement>) {
  const router = useRouterService();
  useEffect(() => {
    const location = router.getCurrentLocation();
    if (textAreaRef?.current && location.state?.focusChat) {
      logger.log(
        'conversation',
        `Focusing textarea on location state change: ${location.pathname}`,
      );

      /** Check if the device is not a touchscreen */
      if (!window.matchMedia?.('(pointer: coarse)').matches) {
        textAreaRef.current?.focus();
      }

      const search = router.getSearchParams().toString();
      const queryString = search ? `?${search}` : '';
      router.navigateTo(`${location.pathname}${queryString}`, {
        replace: true,
        state: {},
      });
    }
  }, [router, textAreaRef]);
}
