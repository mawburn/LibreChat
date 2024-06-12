import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import { TConversation, TMessage, TMessagesAtom } from 'librechat-data-provider';
import { buildTree } from '~/utils';

const conversation = atom<TConversation | null>(null);

// current messages of the conversation, must be an array
// sample structure
// [{text, sender, messageId, parentMessageId, isCreatedByUser}]
const messages = atom<TMessagesAtom>([]);

const messagesTree = atom((get) => {
  const _messages = get(messages);
  return buildTree({ messages: _messages });
});

const latestMessage = atomWithReset<TMessage | null>(null);

const messagesSiblingIdxMapAtom = atom(new Map<string | null | undefined, number>());

const messagesSiblingIdxAtom = (messageId: string | null | undefined) =>
  atom(
    (get) => get(messagesSiblingIdxMapAtom).get(messageId) ?? 0,
    (get, set, value: number) => {
      const map = new Map(get(messagesSiblingIdxMapAtom));
      map.set(messageId, value);
      set(messagesSiblingIdxMapAtom, map);
    },
  );

export default {
  messages,
  conversation,
  messagesTree,
  latestMessage,
  messagesSiblingIdxAtom,
};
