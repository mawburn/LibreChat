import { useCallback, useRef } from 'react';
import isEqual from 'lodash/isEqual';
import { useSearchParams } from 'react-router-dom';
import type { TConversation } from 'librechat-data-provider';

export const useUpdateSearchParams = () => {
  // Store the last set of URL parameters to prevent unnecessary updates and avoid potential
  // infinite loops when components react to URL parameter changes
  const lastParamsRef = useRef<Record<string, string>>({});

  const [, setSearchParams] = useSearchParams();

  // Model parameter keys that should be cleared when using agents or assistants
  const MODEL_PARAM_KEYS = [
    'endpoint',
    'model',
    'temperature',
    'presence_penalty',
    'frequency_penalty',
    'stop',
    'top_p',
    'max_tokens',
    'topP',
    'topK',
    'maxOutputTokens',
    'promptCache',
    'region',
    'maxTokens',
  ];

  const updateSearchParams = useCallback(
    (conversation: TConversation) => {
      setSearchParams(
        (params) => {
          const currentParams = Object.fromEntries(params.entries());
          const newParams: Record<string, string> = { ...currentParams };

          // Handle agent selection
          if (conversation.agent_id) {
            newParams.agent_id = String(conversation.agent_id);

            // Clear assistant_id and model params
            delete newParams.assistant_id;
            MODEL_PARAM_KEYS.forEach((key) => delete newParams[key]);

            // Skip deep equality check for different types of selection
            if (currentParams.agent_id !== newParams.agent_id) {
              lastParamsRef.current = newParams;
            }
            return newParams;
          }

          // Handle assistant selection
          if (conversation.assistant_id) {
            newParams.assistant_id = String(conversation.assistant_id);

            // Clear agent_id and model params
            delete newParams.agent_id;
            MODEL_PARAM_KEYS.forEach((key) => delete newParams[key]);

            // Skip deep equality check for different types of selection
            if (currentParams.assistant_id !== newParams.assistant_id) {
              lastParamsRef.current = newParams;
            }
            return newParams;
          }

          // Handle regular model+endpoint configuration
          delete newParams.agent_id;
          delete newParams.assistant_id;

          // Set or clear endpoint
          if (conversation.endpoint) {
            newParams.endpoint = String(conversation.endpoint);
          } else {
            delete newParams.endpoint;
          }

          // Set or clear model
          if (conversation.model) {
            newParams.model = String(conversation.model);
          } else {
            delete newParams.model;
          }

          // Handle additional model parameters
          const paramMap = {
            temperature: conversation.temperature,
            presence_penalty: conversation.presence_penalty,
            frequency_penalty: conversation.frequency_penalty,
            stop: conversation.stop,
            top_p: conversation.top_p,
            max_tokens: conversation.max_tokens,
            topP: conversation.topP,
            topK: conversation.topK,
            maxOutputTokens: conversation.maxOutputTokens,
            promptCache: conversation.promptCache,
            region: conversation.region,
            maxTokens: conversation.maxTokens,
          };

          // Process each parameter
          Object.entries(paramMap).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                // Handle array values
                if (key === 'stop') {
                  // For stop parameter, use comma-separated values
                  newParams[key] = value.join(',');
                } else {
                  newParams[key] = JSON.stringify(value);
                }
              } else {
                // Handle scalar values
                newParams[key] = String(value);
              }
            } else {
              // Remove undefined/null parameters
              delete newParams[key];
            }
          });

          // Perform deep equality check to prevent unnecessary URL updates
          if (isEqual(lastParamsRef.current, newParams)) {
            return currentParams; // Return unchanged params to prevent update
          }

          // Update reference for next comparison
          lastParamsRef.current = { ...newParams };
          return newParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return updateSearchParams;
};

export default useUpdateSearchParams;
