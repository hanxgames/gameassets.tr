export interface Locale {
  code: string;
  hreflang: string;
  og: string;
  intl: string;
  name: string;
  /** Extra Google Fonts families this script needs beyond Big Shoulders Display + Golos Text. */
  fonts?: string;
}

export const LOCALES: Locale[] = [
  { code: 'en', hreflang: 'en', og: 'en_US', intl: 'en-US', name: 'English' },
  { code: 'tr', hreflang: 'tr', og: 'tr_TR', intl: 'tr-TR', name: 'Türkçe' },
  { code: 'de', hreflang: 'de', og: 'de_DE', intl: 'de-DE', name: 'Deutsch' },
  { code: 'fr', hreflang: 'fr', og: 'fr_FR', intl: 'fr-FR', name: 'Français' },
  { code: 'es', hreflang: 'es', og: 'es_ES', intl: 'es-ES', name: 'Español' },
  { code: 'it', hreflang: 'it', og: 'it_IT', intl: 'it-IT', name: 'Italiano' },
  { code: 'pt', hreflang: 'pt-BR', og: 'pt_BR', intl: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'pl', hreflang: 'pl', og: 'pl_PL', intl: 'pl-PL', name: 'Polski' },
  { code: 'ru', hreflang: 'ru', og: 'ru_RU', intl: 'ru-RU', name: 'Русский', fonts: 'family=Oswald:wght@700' },
  { code: 'ja', hreflang: 'ja', og: 'ja_JP', intl: 'ja-JP', name: '日本語', fonts: 'family=Noto+Sans+JP:wght@400;500;800' },
  { code: 'ko', hreflang: 'ko', og: 'ko_KR', intl: 'ko-KR', name: '한국어', fonts: 'family=Noto+Sans+KR:wght@400;500;800' },
  { code: 'zh', hreflang: 'zh-Hans', og: 'zh_CN', intl: 'zh-CN', name: '简体中文', fonts: 'family=Noto+Sans+SC:wght@400;500;800' },
  { code: 'id', hreflang: 'id', og: 'id_ID', intl: 'id-ID', name: 'Bahasa Indonesia' },
  { code: 'vi', hreflang: 'vi', og: 'vi_VN', intl: 'vi-VN', name: 'Tiếng Việt', fonts: 'family=Be+Vietnam+Pro:wght@400;500;800' },
];

export const DEFAULT_LOCALE = 'en';
export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const OTHER_LOCALES = LOCALES.filter((l) => l.code !== DEFAULT_LOCALE);
export const localeOf = (code: string) => LOCALES.find((l) => l.code === code) ?? LOCALES[0];

/** Locale-prefixed path; English stays at the root. `path` always starts and ends with "/". */
export const localePath = (code: string, path: string) => (code === DEFAULT_LOCALE ? path : `/${code}${path}`);
