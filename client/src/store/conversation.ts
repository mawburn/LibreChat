import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import { TConversation, TMessage, TMessagesAtom } from 'librechat-data-provider';
import { atomFamily } from 'recoil';
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
