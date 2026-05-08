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

/** exlia getTaxonomy `lang` codes; path keys normalized to lowercase with `_` as `-`. Do not use TAG_LANGUAGES for this. */
const PATH_SEGMENT_TO_EXLIA_TAXONOMY_LANG = {
  en: 'en',
  de: 'de',
  es: 'es',
  fr: 'fr',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  nl: 'nl',
  sv: 'sv',
  pt: 'pt',
  'pt-br': 'pt',
  'zh-hans': 'zh-Hans',
  'zh-hant': 'zh-Hant',
};

/**
 * Maps first Helix URL segment to exlia `getTaxonomy` `lang` (allow list: de, fr, ja, es, it, ko, zh-Hans, zh-Hant, pt, nl, sv, en).
 *
 * @param {string | undefined | null} pathLang e.g. "fr", "pt-BR", "zh-Hans"
 * @returns {string}
 */
export function mapPathSegmentToExliaTaxonomyLang(pathLang) {
  if (!pathLang) return 'en';
  const norm = pathLang.toLowerCase().replace(/_/g, '-');
  return (
    PATH_SEGMENT_TO_EXLIA_TAXONOMY_LANG[norm] ??
    PATH_SEGMENT_TO_EXLIA_TAXONOMY_LANG[norm.split('-')[0]] ??
    norm
  );
}

export const getMatchLanguage = (lang) => {
  if (lang) {
    return LANGUAGES.find((l) => l.toLowerCase() === lang.toLowerCase());
  }
  return lang;
};

export const getMatchLanguageForTag = (lang) =>
  TAG_LANGUAGES[lang] || 'default';
