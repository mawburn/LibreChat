import { atomFamily } from 'recoil';
import { TConversation, TMessagesAtom, TMessage } from 'librechat-data-provider';
import { buildTree } from '~/utils';
import { atom } from 'jotai';

const conversation = atom<TConversation | null>(null);
const messages = atom<TMessagesAtom[]>([]);
const latestMessage = atom<TMessage | null>(null);

const messagesTree = atom((get) => {
  const messagesValue = get(messages);
  return buildTree({ messages: messagesValue });
});

const messagesSiblingIdxFamily = atomFamily<number, string | null | undefined>({
  key: 'messagesSiblingIdx',
  default: 0,
});

export default {
  messages,
  conversation,
  messagesTree,
  latestMessage,
  messagesSiblingIdxFamily,
};
