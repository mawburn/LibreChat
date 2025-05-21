import download from 'downloadjs';
import { useCallback } from 'react';
import exportFromJSON from 'export-from-json';
import { useQueryClient } from '@tanstack/react-query';
import {
  QueryKeys,
  ContentTypes,
  ToolCallTypes,
  imageGenTools,
  isImageVisionTool,
} from 'librechat-data-provider';
import type {
  TMessage,
  TPreset,
  TConversation,
  TMessageContentParts,
} from 'librechat-data-provider';
import useBuildMessageTree from '~/hooks/Messages/useBuildMessageTree';
import { useScreenshot } from '~/hooks/ScreenshotContext';
import { cleanupPreset, buildTree } from '~/utils';
import { useTypedParams } from '~/routes/RouterService';

type ExportValues = {
  fieldName: string;
  fieldValues: string[];
};
type ExportEntries = ExportValues[];

export default function useExportConversation({
  conversation,
  filename,
  type,
  includeOptions,
  exportBranches,
  recursive,
}: {
  conversation: TConversation | null;
  filename: string;
  type: string;
  includeOptions: boolean | 'indeterminate';
  exportBranches: boolean | 'indeterminate';
  recursive: boolean | 'indeterminate';
}) {
  const queryClient = useQueryClient();
  const { captureScreenshot } = useScreenshot();
  const buildMessageTree = useBuildMessageTree();

  const { conversationId: paramId } = useTypedParams<{ conversationId: string }>();

  const getMessageTree = useCallback(() => {
    const queryParam =
      paramId === 'new' ? paramId : (conversation?.conversationId ?? paramId ?? '');
    const messages = queryClient.getQueryData<TMessage[]>([QueryKeys.messages, queryParam]) ?? [];
    const dataTree = buildTree({ messages });
    return dataTree?.length === 0 ? null : (dataTree ?? null);
  }, [paramId, conversation?.conversationId, queryClient]);

  const getMessageText = (message: TMessage | undefined, format = 'text') => {
    if (!message) {
      return '';
    }

    const formatText = (sender: string, text: string) => {
      if (format === 'text') {
        return `>> ${sender}:\n${text}`;
      }
      return `**${sender}**\n${text}`;
    };

    if (!message.content) {
      return formatText(message.sender || '', message.text);
    }

    return message.content
      .map((content) => getMessageContent(message.sender || '', content))
      .map((text) => {
        return formatText(text[0], text[1]);
      })
      .join('\n\n\n');
  };

  /**
   * Format and return message texts according to the type of content.
   * Currently, content whose type is `TOOL_CALL` basically returns JSON as is.
   * In the future, different formatted text may be returned for each type.
   */
  const getMessageContent = (sender: string, content?: TMessageContentParts): string[] => {
    if (!content) {
      return [];
    }

    if (content.type === ContentTypes.ERROR) {
      // ERROR
      const textContent = content[ContentTypes.TEXT];
      if (textContent && typeof textContent === 'object' && 'value' in textContent) {
        return [sender, textContent.value];
      }
      return [sender, String(textContent)];
    }

    if (content.type === ContentTypes.TEXT) {
      // TEXT
      const textPart = content[ContentTypes.TEXT];
      if (!textPart) {
        return [sender, ''];
      }
      const text = typeof textPart === 'string' ? textPart : textPart.value || '';
      return [sender, text];
    }

    if (content.type === ContentTypes.TOOL_CALL) {
      const toolCallContent = content[ContentTypes.TOOL_CALL];
      if (!toolCallContent) {
        return [sender, '{}'];
      }

      const type = toolCallContent.type;

      if (type === ToolCallTypes.CODE_INTERPRETER) {
        // CODE_INTERPRETER
        const code_interpreter = toolCallContent[ToolCallTypes.CODE_INTERPRETER];
        return ['Code Interpreter', JSON.stringify(code_interpreter || {})];
      }

      if (type === ToolCallTypes.RETRIEVAL) {
        // RETRIEVAL
        return ['Retrieval', JSON.stringify(toolCallContent || {})];
      }

      if (
        type === ToolCallTypes.FUNCTION &&
        toolCallContent.function?.name &&
        imageGenTools.has(toolCallContent.function.name)
      ) {
        // IMAGE_GENERATION
        return ['Tool', JSON.stringify(toolCallContent || {})];
      }

      if (type === ToolCallTypes.FUNCTION) {
        // IMAGE_VISION
        if (isImageVisionTool(toolCallContent)) {
          return ['Tool', JSON.stringify(toolCallContent || {})];
        }
        return ['Tool', JSON.stringify(toolCallContent || {})];
      }

      // Default for unknown tool call types
      return ['Tool', JSON.stringify(toolCallContent || {})];
    }

    if (content.type === ContentTypes.IMAGE_FILE) {
      // IMAGE
      const imageFile = content[ContentTypes.IMAGE_FILE];
      return ['Image', JSON.stringify(imageFile || {})];
    }

    return [sender, JSON.stringify(content)];
  };

  const exportScreenshot = async () => {
    let data;
    try {
      data = await captureScreenshot();
    } catch (err) {
      console.error('Failed to capture screenshot');
      return console.error(err);
    }
    download(data, `${filename}.png`, 'image/png');
  };

  const exportCSV = async () => {
    const data: TMessage[] = [];

    const messages = await buildMessageTree({
      messageId: conversation?.conversationId || undefined,
      message: null,
      messages: getMessageTree(),
      branches: Boolean(exportBranches),
      recursive: false,
    });

    if (messages) {
      if (Array.isArray(messages)) {
        for (const message of messages) {
          if (message) {
            // Make sure required fields exist to satisfy TMessage type
            const completeMessage: TMessage = {
              ...message,
              messageId: message.messageId || '',
              conversationId: message.conversationId || null,
              parentMessageId: message.parentMessageId || null,
              text: message.text || '',
              isCreatedByUser: message.isCreatedByUser || false,
              error: message.error || false,
            };
            data.push(completeMessage);
          }
        }
      } else {
        // Cast to TMessage with required fields
        const completeMessage: TMessage = {
          ...messages,
          messageId: messages.messageId || '',
          conversationId: messages.conversationId || null,
          parentMessageId: messages.parentMessageId || null,
          text: messages.text || '',
          isCreatedByUser: messages.isCreatedByUser || false,
          error: messages.error || false,
        };
        data.push(completeMessage);
      }
    }

    exportFromJSON({
      data: data,
      fileName: filename,
      extension: 'csv',
      exportType: exportFromJSON.types.csv,
      beforeTableEncode: (entries: ExportEntries | undefined) => [
        {
          fieldName: 'sender',
          fieldValues: entries?.find((e) => e.fieldName == 'sender')?.fieldValues ?? [],
        },
        {
          fieldName: 'text',
          fieldValues: entries?.find((e) => e.fieldName == 'text')?.fieldValues ?? [],
        },
        {
          fieldName: 'isCreatedByUser',
          fieldValues: entries?.find((e) => e.fieldName == 'isCreatedByUser')?.fieldValues ?? [],
        },
        {
          fieldName: 'error',
          fieldValues: entries?.find((e) => e.fieldName == 'error')?.fieldValues ?? [],
        },
        {
          fieldName: 'unfinished',
          fieldValues: entries?.find((e) => e.fieldName == 'unfinished')?.fieldValues ?? [],
        },
        {
          fieldName: 'messageId',
          fieldValues: entries?.find((e) => e.fieldName == 'messageId')?.fieldValues ?? [],
        },
        {
          fieldName: 'parentMessageId',
          fieldValues: entries?.find((e) => e.fieldName == 'parentMessageId')?.fieldValues ?? [],
        },
        {
          fieldName: 'createdAt',
          fieldValues: entries?.find((e) => e.fieldName == 'createdAt')?.fieldValues ?? [],
        },
      ],
    });
  };

  const exportMarkdown = async () => {
    let data =
      '# Conversation\n' +
      `- conversationId: ${conversation?.conversationId || 'N/A'}\n` +
      `- endpoint: ${conversation?.endpoint || 'N/A'}\n` +
      `- title: ${conversation?.title || 'Untitled'}\n` +
      `- exportAt: ${new Date().toTimeString()}\n`;

    if (includeOptions === true && conversation) {
      data += '\n## Options\n';
      const options = cleanupPreset({ preset: conversation as TPreset });

      for (const key of Object.keys(options)) {
        data += `- ${key}: ${options[key]}\n`;
      }
    }

    const messagesResult = await buildMessageTree({
      messageId: conversation?.conversationId || undefined,
      message: null,
      messages: getMessageTree(),
      branches: false,
      recursive: false,
    });

    data += '\n## History\n';
    if (messagesResult) {
      if (Array.isArray(messagesResult)) {
        for (const partialMessage of messagesResult) {
          if (partialMessage) {
            // Ensure we have a complete message with required fields
            const message = {
              ...partialMessage,
              messageId: partialMessage.messageId || '',
              conversationId: partialMessage.conversationId || null,
              parentMessageId: partialMessage.parentMessageId || null,
              text: partialMessage.text || '',
              isCreatedByUser: partialMessage.isCreatedByUser || false,
              error: partialMessage.error || false,
            };

            data += `${getMessageText(message, 'md')}\n`;
            if (message.error) {
              data += '*(This is an error message)*\n';
            }
            if (message.unfinished === true) {
              data += '*(This is an unfinished message)*\n';
            }
            data += '\n\n';
          }
        }
      } else {
        // Create a complete message for non-array result
        const message = {
          ...messagesResult,
          messageId: messagesResult.messageId || '',
          conversationId: messagesResult.conversationId || null,
          parentMessageId: messagesResult.parentMessageId || null,
          text: messagesResult.text || '',
          isCreatedByUser: messagesResult.isCreatedByUser || false,
          error: messagesResult.error || false,
        };

        data += `${getMessageText(message, 'md')}\n`;
        if (message.error) {
          data += '*(This is an error message)*\n';
        }
        if (message.unfinished === true) {
          data += '*(This is an unfinished message)*\n';
        }
      }
    } else {
      data += 'No messages found.\n';
    }

    exportFromJSON({
      data: data,
      fileName: filename,
      extension: 'md',
      exportType: exportFromJSON.types.txt,
    });
  };

  const exportText = async () => {
    let data =
      'Conversation\n' +
      '########################\n' +
      `conversationId: ${conversation?.conversationId || 'N/A'}\n` +
      `endpoint: ${conversation?.endpoint || 'N/A'}\n` +
      `title: ${conversation?.title || 'Untitled'}\n` +
      `exportAt: ${new Date().toTimeString()}\n`;

    if (includeOptions === true && conversation) {
      data += '\nOptions\n########################\n';
      const options = cleanupPreset({ preset: conversation as TPreset });

      for (const key of Object.keys(options)) {
        data += `${key}: ${options[key]}\n`;
      }
    }

    const messagesResult = await buildMessageTree({
      messageId: conversation?.conversationId || undefined,
      message: null,
      messages: getMessageTree(),
      branches: false,
      recursive: false,
    });

    data += '\nHistory\n########################\n';
    if (messagesResult) {
      if (Array.isArray(messagesResult)) {
        for (const partialMessage of messagesResult) {
          if (partialMessage) {
            // Create a complete message object
            const message = {
              ...partialMessage,
              messageId: partialMessage.messageId || '',
              conversationId: partialMessage.conversationId || null,
              parentMessageId: partialMessage.parentMessageId || null,
              text: partialMessage.text || '',
              isCreatedByUser: partialMessage.isCreatedByUser || false,
              error: partialMessage.error || false,
            };

            data += `${getMessageText(message)}\n`;
            if (message.error) {
              data += '(This is an error message)\n';
            }
            if (message.unfinished === true) {
              data += '(This is an unfinished message)\n';
            }
            data += '\n\n';
          }
        }
      } else {
        // Create a complete message for non-array result
        const message = {
          ...messagesResult,
          messageId: messagesResult.messageId || '',
          conversationId: messagesResult.conversationId || null,
          parentMessageId: messagesResult.parentMessageId || null,
          text: messagesResult.text || '',
          isCreatedByUser: messagesResult.isCreatedByUser || false,
          error: messagesResult.error || false,
        };

        data += `${getMessageText(message)}\n`;
        if (message.error) {
          data += '(This is an error message)\n';
        }
        if (message.unfinished === true) {
          data += '(This is an unfinished message)\n';
        }
      }
    } else {
      data += 'No messages found.\n';
    }

    exportFromJSON({
      data: data,
      fileName: filename,
      extension: 'txt',
      exportType: exportFromJSON.types.txt,
    });
  };

  const exportJSON = async () => {
    const data: Record<string, any> = {
      conversationId: conversation?.conversationId || null,
      endpoint: conversation?.endpoint || null,
      title: conversation?.title || null,
      exportAt: new Date().toTimeString(),
      branches: exportBranches,
      recursive: recursive,
    };

    if (includeOptions === true && conversation) {
      data['options'] = cleanupPreset({ preset: conversation as TPreset });
    }

    const messagesResult = await buildMessageTree({
      messageId: conversation?.conversationId || undefined,
      message: null,
      messages: getMessageTree(),
      branches: Boolean(exportBranches),
      recursive: Boolean(recursive),
    });

    if (messagesResult) {
      if (recursive === true && !Array.isArray(messagesResult) && 'children' in messagesResult) {
        // Create a properly typed complete message
        const processedMessage = {
          ...messagesResult,
          messageId: messagesResult.messageId || '',
          conversationId: messagesResult.conversationId || null,
          parentMessageId: messagesResult.parentMessageId || null,
          text: messagesResult.text || '',
          isCreatedByUser: messagesResult.isCreatedByUser || false,
          error: messagesResult.error || false,
        };

        // Process children to ensure they all have the required fields
        const processedChildren = Array.isArray(messagesResult.children)
          ? messagesResult.children
              .map((child) => {
                if (!child) return null;
                return {
                  ...child,
                  messageId: child.messageId || '',
                  conversationId: child.conversationId || null,
                  parentMessageId: child.parentMessageId || null,
                  text: child.text || '',
                  isCreatedByUser: child.isCreatedByUser || false,
                  error: child.error || false,
                };
              })
              .filter(Boolean)
          : [];

        data['messagesTree'] = processedChildren;
      } else {
        // For array type results, ensure each message is complete
        if (Array.isArray(messagesResult)) {
          const processedMessages = messagesResult
            .map((message) => {
              if (!message) return null;
              return {
                ...message,
                messageId: message.messageId || '',
                conversationId: message.conversationId || null,
                parentMessageId: message.parentMessageId || null,
                text: message.text || '',
                isCreatedByUser: message.isCreatedByUser || false,
                error: message.error || false,
              };
            })
            .filter(Boolean);

          data['messages'] = processedMessages;
        } else {
          // Single message that's not in an array
          const processedMessage = {
            ...messagesResult,
            messageId: messagesResult.messageId || '',
            conversationId: messagesResult.conversationId || null,
            parentMessageId: messagesResult.parentMessageId || null,
            text: messagesResult.text || '',
            isCreatedByUser: messagesResult.isCreatedByUser || false,
            error: messagesResult.error || false,
          };

          data['messages'] = [processedMessage];
        }
      }
    } else {
      data['messages'] = [];
    }

    exportFromJSON({
      data: data,
      fileName: filename,
      extension: 'json',
      exportType: exportFromJSON.types.json,
    });
  };

  const exportConversation = () => {
    if (type === 'json') {
      exportJSON();
    } else if (type == 'text') {
      exportText();
    } else if (type == 'markdown') {
      exportMarkdown();
    } else if (type == 'csv') {
      exportCSV();
    } else if (type == 'screenshot') {
      exportScreenshot();
    }
  };

  return { exportConversation };
}
