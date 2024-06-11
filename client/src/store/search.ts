import { atom } from 'jotai';

const isSearchEnabled = atom<boolean | null>(null);

const searchQuery = atom('');

export default {
  isSearchEnabled,
  searchQuery,
};
