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

const LANGUAGESMAP = {
  'de-de': 'de',
  en: 'en',
  'es-es': 'es',
  'fr-fr': 'fr',
  'it-it': 'it',
  'nl-nl': 'nl',
  'pt-br': 'pt-br',
  'sv-se': 'sv',
  'zh-hans': 'zh-hans',
  'zh-hant': 'zh-hant',
  'ja-jp': 'ja',
  'ko-kr': 'ko',
};

export const getMatchLanguage = (lang) => {
  if (lang) {
    return LANGUAGES.find((l) => l.toLowerCase() === lang.toLowerCase());
  }
  return lang;
};

export const getMatchLanguageCode = (lang) => {
  if (lang) {
    const lowercaseLang = lang.toLowerCase();
    if (LANGUAGESMAP[lowercaseLang]) {
      return LANGUAGESMAP[lowercaseLang];
    }
  }
  return lang;
};
