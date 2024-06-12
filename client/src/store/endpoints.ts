import { atom } from 'jotai';
import { EModelEndpoint } from 'librechat-data-provider';
import type { TEndpointsConfig } from 'librechat-data-provider';

const defaultConfig: TEndpointsConfig = {
  [EModelEndpoint.azureOpenAI]: null,
  [EModelEndpoint.azureAssistants]: null,
  [EModelEndpoint.assistants]: null,
  [EModelEndpoint.openAI]: null,
  [EModelEndpoint.bingAI]: null,
  [EModelEndpoint.chatGPTBrowser]: null,
  [EModelEndpoint.gptPlugins]: null,
  [EModelEndpoint.google]: null,
  [EModelEndpoint.anthropic]: null,
  [EModelEndpoint.custom]: null,
};

const endpointsConfig = atom<TEndpointsConfig>(defaultConfig);

const endpointsQueryEnabled = atom<boolean>(true);

const plugins = atom((get) => {
  const config = get(endpointsConfig) || {};
  return config?.gptPlugins?.plugins || {};
});

const endpointsFilter = atom((get) => {
  const config = get(endpointsConfig) || {};

  const filter = {};
  for (const key of Object.keys(config)) {
    filter[key] = !!config[key];
  }
  return filter;
});

export default {
  plugins,
  endpointsConfig,
  endpointsFilter,
  defaultConfig,
  endpointsQueryEnabled,
};
