import { atom } from 'jotai';
import { TPreset } from 'librechat-data-provider';

const presets = atom<TPreset[]>([]);

const preset = atom<TPreset | null>(null);

const defaultPreset = atom<TPreset | null>(null);

const presetModalVisible = atom<boolean>(false);

export default {
  preset,
  presets,
  defaultPreset,
  presetModalVisible,
};
