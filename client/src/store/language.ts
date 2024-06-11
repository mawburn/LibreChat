import { atomWithStorage } from 'jotai/utils';

const userLang = navigator.language || navigator.languages[0];

const lang = atomWithStorage('lang', userLang);

export default { lang };
