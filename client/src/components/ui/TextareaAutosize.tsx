import { useAtomValue } from 'jotai';
import { forwardRef, useLayoutEffect, useState } from 'react';
import ReactTextareaAutosize from 'react-textarea-autosize';
import type { TextareaAutosizeProps } from 'react-textarea-autosize';
import store from '~/store';

export const TextareaAutosize = forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
  (props, ref) => {
    const [, setIsRerendered] = useState(false);
    const chatDirection = useAtomValue(store.chatDirection).toLowerCase();
    useLayoutEffect(() => setIsRerendered(true), []);
    return <ReactTextareaAutosize dir={chatDirection} {...props} ref={ref} />;
  },
);
