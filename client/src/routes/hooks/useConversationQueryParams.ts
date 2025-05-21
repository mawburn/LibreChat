import { useCallback } from 'react';
import { useRouterService } from '../RouterService';

export default function useConversationQueryParams() {
  const router = useRouterService();

  const getConvoParams = useCallback(() => {
    const params = router.getSearchParams();
    return {
      endpoint: params.get('endpoint'),
      model: params.get('model'),
      temperature: params.get('temperature') ? parseFloat(params.get('temperature')!) : undefined,
      contextMessages: params.get('contextMessages')
        ? parseInt(params.get('contextMessages')!)
        : undefined,
    };
  }, [router]);

  const setConvoParams = useCallback(
    (
      params: {
        endpoint?: string | null;
        model?: string | null;
        temperature?: number | null;
        contextMessages?: number | null;
      },
      options: { replace?: boolean } = {},
    ) => {
      const searchParams: Record<string, string> = {};

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams[key] = value.toString();
        }
      });

      router.setQueryParams(searchParams, options);
    },
    [router],
  );

  return { getConvoParams, setConvoParams };
}
