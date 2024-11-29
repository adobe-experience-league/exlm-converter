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

const TAG_LANGUAGES = {
  en: 'en',
  de: 'de',
  es: 'es',
  fr: 'fr',
  it: 'it',
  ja: 'ja',
  nl: 'nl',
  'pt-br': 'pt',
  sv: 'sv',
  'zh-hant': 'tw',
  'zh-hans': 'zh',
  ko: 'ko',
};

export const getMatchLanguage = (lang) => {
  if (lang) {
    return LANGUAGES.find((l) => l.toLowerCase() === lang.toLowerCase());
  }
  return lang;
};

export const getMatchLanguageForTag = (lang) => {
  if (lang) {
    return TAG_LANGUAGES[lang] || 'default';
  }
  return 'default';
};
