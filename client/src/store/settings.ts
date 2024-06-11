import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { SettingsViews } from 'librechat-data-provider';
import type { TOptionSettings } from '~/common';

// Static atoms without localStorage
const staticAtoms = {
  abortScroll: atom<boolean>(false),
  showFiles: atom<boolean>(false),
  optionSettings: atom<TOptionSettings>({}),
  showPluginStoreDialog: atom<boolean>(false),
  showAgentSettings: atom<boolean>(false),
  currentSettingsView: atom<SettingsViews>(SettingsViews.default),
  showBingToneSetting: atom<boolean>(false),
  showPopover: atom<boolean>(false),
};

// Atoms with localStorage
const localStorageAtoms = {
  autoScroll: atomWithStorage('autoScroll', false),
  showCode: atomWithStorage('showCode', false),
  hideSidePanel: atomWithStorage('hideSidePanel', false),
  modularChat: atomWithStorage('modularChat', true),
  LaTeXParsing: atomWithStorage('LaTeXParsing', true),
  UsernameDisplay: atomWithStorage('UsernameDisplay', true),
  TextToSpeech: atomWithStorage('textToSpeech', true),
  automaticPlayback: atomWithStorage('automaticPlayback', false),
  enterToSend: atomWithStorage('enterToSend', true),
  SpeechToText: atomWithStorage('speechToText', true),
  conversationMode: atomWithStorage('conversationMode', false),
  advancedMode: atomWithStorage('advancedMode', false),
  autoSendText: atomWithStorage('autoSendText', false),
  autoTranscribeAudio: atomWithStorage('autoTranscribeAudio', false),
  decibelValue: atomWithStorage('decibelValue', -45),
  endpointSTT: atomWithStorage('endpointSTT', 'browser'),
  endpointTTS: atomWithStorage('endpointTTS', 'browser'),
  cacheTTS: atomWithStorage('cacheTTS', true),
  voice: atomWithStorage('voice', ''),
  forkSetting: atomWithStorage('forkSetting', ''),
  splitAtTarget: atomWithStorage('splitAtTarget', false),
  rememberForkOption: atomWithStorage('rememberForkOption', true),
  playbackRate: atomWithStorage<number | null>('playbackRate', null),
};

export default { ...staticAtoms, ...localStorageAtoms };
