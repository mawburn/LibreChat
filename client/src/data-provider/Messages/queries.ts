import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type * as t from 'librechat-data-provider';
import { logger } from '~/utils';
import { useRouterService } from '~/routes/RouterService';

export const useGetMessagesByConvoId = <TData = t.TMessage[]>(
  id: string,
  config?: UseQueryOptions<t.TMessage[], unknown, TData>,
): QueryObserverResult<TData> => {
  const router = useRouterService();
  const queryClient = useQueryClient();
  return useQuery<t.TMessage[], unknown, TData>(
    [QueryKeys.messages, id],
    async () => {
      const result = await dataService.getMessagesByConvoId(id);
      const currentPath = router.getCurrentPath();
      if (!currentPath.includes('/c/new') && result?.length === 1) {
        const currentMessages = queryClient.getQueryData<t.TMessage[]>([QueryKeys.messages, id]);
        if (currentMessages?.length === 1) {
          return result;
        }
        if (currentMessages && currentMessages?.length > 1) {
          logger.warn(
            'messages',
            `Messages query for convo ${id} returned fewer than cache; path: "${currentPath}"`,
            result,
            currentMessages,
          );
          return currentMessages;
        }
      }
      return result;
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};
