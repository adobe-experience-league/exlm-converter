const LANGUAGES = [
  'de',
  'en',
  'es',
  'fr',
  'it',
  'nl',
  'pt-BR',
  'sv',
  'zh-Hans',
  'zh-Hant',
  'ja',
  'ko',
];

export const getMatchLanguage = (lang) => {
  if (lang) {
    return LANGUAGES.find((l) => l.toLowerCase() === lang.toLowerCase());
  }
  return lang;
};
