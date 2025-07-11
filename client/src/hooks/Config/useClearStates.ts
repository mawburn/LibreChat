import { useStore } from 'jotai';
import { useCallback } from 'react';
import { clearLocalStorage } from '~/utils/localStorage';
import store from '~/store';

export default function useClearStates() {
  const jotaiStore = useStore();
  const clearConversations = store.useClearConvoState();
  const clearSubmissions = store.useClearSubmissionState();
  const clearLatestMessages = store.useClearLatestMessages();

  const clearStates = useCallback(
    async (skipFirst?: boolean) => {
      await clearSubmissions(skipFirst);
      await clearConversations(skipFirst);
      await clearLatestMessages(skipFirst);

      const keys = jotaiStore.get(store.conversationKeysAtom);

      for (const key of keys) {
        if (skipFirst === true && key === 0) {
          continue;
        }

        jotaiStore.set(store.filesByIndex(key), new Map());
        jotaiStore.set(store.presetByIndex(key), null);
        jotaiStore.set(store.textByIndex(key), '');
        jotaiStore.set(store.showStopButtonByIndex(key), false);
        jotaiStore.set(store.abortScrollFamily(key), false);
        jotaiStore.set(store.isSubmittingFamily(key), false);
        jotaiStore.set(store.optionSettingsFamily(key), {});
        jotaiStore.set(store.showAgentSettingsFamily(key), false);
        jotaiStore.set(store.showPopoverFamily(key), false);
        jotaiStore.set(store.showMentionPopoverFamily(key), false);
        jotaiStore.set(store.showPlusPopoverFamily(key), false);
        jotaiStore.set(store.showPromptsPopoverFamily(key), false);
        jotaiStore.set(store.activePromptByIndex(key), undefined);
        jotaiStore.set(store.globalAudioURLFamily(key), null);
        jotaiStore.set(store.globalAudioFetchingFamily(key), false);
        jotaiStore.set(store.globalAudioPlayingFamily(key), false);
        jotaiStore.set(store.activeRunFamily(key), '');
        jotaiStore.set(store.audioRunFamily(key), '');
        jotaiStore.set(store.messagesSiblingIdxFamily(key.toString()), 0);
      }

      clearLocalStorage(skipFirst);
    },
    [jotaiStore, clearSubmissions, clearConversations, clearLatestMessages],
  );

  return clearStates;
}
