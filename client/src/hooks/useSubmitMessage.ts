import { useCallback } from 'react';
import { useChatContext } from '~/Providers';
import { useRouterService } from '~/routes/RouterService';

export const useSubmitMessage = () => {
  const router = useRouterService();
  const { ask } = useChatContext();

  const submitMessage = useCallback(
    async (data: { text: string }) => {
      const isSubmitting = router.isNavigating();

      if (isSubmitting) return;

      try {
        const clientTimestamp = new Date().toISOString();

        ask({
          text: data.text,
          clientTimestamp,
        });
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [ask, router],
  );

  return { submitMessage, isSubmitting: router.isNavigating() };
};
