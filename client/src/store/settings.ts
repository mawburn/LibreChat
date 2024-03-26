import { atom as recAtom } from 'recoil';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { TOptionSettings } from '~/common';

const abortScroll = atom<boolean>(false);
const showFiles = atom(false);
const optionSettings = atom<TOptionSettings>({} as TOptionSettings);
const showPluginStoreDialog = atom(false);
const showAgentSettings = atom(false);
const showBingToneSetting = atom(false);
const showPopover = atom(false);

const autoScroll = atomWithStorage<boolean>(
  'autoScroll',
  localStorage.getItem('autoScroll') === 'true',
);

const hideSidePanel = atomWithStorage(
  'hideSidePanel',
  localStorage.getItem('hideSidePanel') === 'true',
);

const modularChat = atomWithStorage('modularChat', localStorage.getItem('modularChat') === 'true');

const LaTeXParsing = atomWithStorage(
  'LaTeXParsing',
  localStorage.getItem('LaTeXParsing') === 'true',
);

const UsernameDisplay = atomWithStorage(
  'UsernameDisplay',
  localStorage.getItem('UsernameDisplay') === 'true',
);

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
