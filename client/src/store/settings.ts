import { atom as recAtom } from 'recoil';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { TOptionSettings } from '~/common';

const abortScroll = recAtom<boolean>({
  key: 'abortScroll',
  default: false,
});

const showFiles = recAtom<boolean>({
  key: 'showFiles',
  default: false,
});

const optionSettings = recAtom<TOptionSettings>({
  key: 'optionSettings',
  default: {},
});

const showPluginStoreDialog = recAtom<boolean>({
  key: 'showPluginStoreDialog',
  default: false,
});

const showAgentSettings = recAtom<boolean>({
  key: 'showAgentSettings',
  default: false,
});

const showBingToneSetting = recAtom<boolean>({
  key: 'showBingToneSetting',
  default: false,
});

const showPopover = recAtom<boolean>({
  key: 'showPopover',
  default: false,
});

const autoScroll = atomWithStorage<boolean>(
  'autoScroll',
  localStorage.getItem('autoScroll') === 'true',
);

const hideSidePanel = recAtom<boolean>({
  key: 'hideSidePanel',
  default: localStorage.getItem('hideSidePanel') === 'true',
  effects: [
    ({ setSelf, onSet }) => {
      const savedValue = localStorage.getItem('hideSidePanel');
      if (savedValue != null) {
        setSelf(savedValue === 'true');
      }

      onSet((newValue: unknown) => {
        if (typeof newValue === 'boolean') {
          localStorage.setItem('hideSidePanel', newValue.toString());
        }
      });
    },
  ] as const,
});

const modularChat = recAtom<boolean>({
  key: 'modularChat',
  default: localStorage.getItem('modularChat') === 'true',
  effects: [
    ({ setSelf, onSet }) => {
      const savedValue = localStorage.getItem('modularChat');
      if (savedValue != null) {
        setSelf(savedValue === 'true');
      }

      onSet((newValue: unknown) => {
        if (typeof newValue === 'boolean') {
          localStorage.setItem('modularChat', newValue.toString());
        }
      });
    },
  ] as const,
});

const LaTeXParsing = recAtom<boolean>({
  key: 'LaTeXParsing',
  default: true,
  effects: [
    ({ setSelf, onSet }) => {
      const savedValue = localStorage.getItem('LaTeXParsing');
      if (savedValue != null) {
        setSelf(savedValue === 'true');
      }

      onSet((newValue: unknown) => {
        if (typeof newValue === 'boolean') {
          localStorage.setItem('LaTeXParsing', newValue.toString());
        }
      });
    },
  ] as const,
});

const UsernameDisplay = recAtom<boolean>({
  key: 'UsernameDisplay',
  default: localStorage.getItem('UsernameDisplay') === 'true',
  effects: [
    ({ setSelf, onSet }) => {
      const savedValue = localStorage.getItem('UsernameDisplay');
      if (savedValue != null) {
        setSelf(savedValue === 'true');
      }

      onSet((newValue: unknown) => {
        if (typeof newValue === 'boolean') {
          localStorage.setItem('UsernameDisplay', newValue.toString());
        }
      });
    },
  ] as const,
});

export default {
  abortScroll,
  showFiles,
  optionSettings,
  showPluginStoreDialog,
  showAgentSettings,
  showBingToneSetting,
  showPopover,
  autoScroll,
  hideSidePanel,
  modularChat,
  LaTeXParsing,
  UsernameDisplay,
};
