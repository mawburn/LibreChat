import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import store from '~/store';

const useConversations = () => {
  const setRefreshConversationsHint = useSetAtom(store.refreshConversationsHint);

  const refreshConversations = useCallback(() => {
    setRefreshConversationsHint((prevState) => prevState + 1);
  }, [setRefreshConversationsHint]);

  return { refreshConversations };
};

export default useConversations;
