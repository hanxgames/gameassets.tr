import en from './ui/en.json';
import { localeOf, localePath } from './locales';
import { ENGINES, type Asset, type Bundle, type EngineKey, bundleKey } from '../data/site';

type Dict = Record<string, string>;
const dicts = import.meta.glob<Dict>('./ui/*.json', { eager: true, import: 'default' });
const packDicts = import.meta.glob<Record<string, { short?: string; headline?: string }>>('./packs/*.json', { eager: true, import: 'default' });

const fill = (s: string, v: Record<string, string | number> = {}) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));

export type T = (key: string, vars?: Record<string, string | number>) => string;

/** Translator for a locale, falling back to English for any missing key. */
export function useT(lang: string): T {
  const d = dicts[`./ui/${lang}.json`] ?? {};
  return (key, vars) => fill(d[key] ?? (en as Dict)[key] ?? key, vars);
}

/** English pack headline without the leading emoji or the repeated title. */
export function cleanHeadline(a: Asset) {
  return a.headline
    .replace(/^(?:\p{Extended_Pictographic}|️|‍)+\s*/u, '')
    .replace(a.title, '')
    .replace(/^\s*[—–-]\s*/, '')
    .trim();
}

/** Localized short copy for a pack, falling back to the English text from itch.io. */
export function packText(lang: string, a: Asset) {
  const p = packDicts[`./packs/${lang}.json`]?.[a.slug];
  return { short: p?.short || a.shortDescription, headline: p?.headline || cleanHeadline(a) };
}

const descDicts = import.meta.glob<Record<string, string>>('./desc/*.json', { eager: true, import: 'default' });

/** Long pack description in the page's language when a translation exists, else the English text from itch.io. */
export function packDescription(lang: string, a: Asset): { html: string; translated: boolean } {
  const tr = lang === 'en' ? undefined : descDicts[`./desc/${lang}.json`]?.[a.slug];
  const html = tr ?? a.descriptionHtml.replace(/(<h[2-4][^>]*>)\s*(?:\p{Extended_Pictographic}|️|‍)+\s*/gu, '$1');
  return { html: html.replace(/href="\/assets\//g, `href="${localePath(lang, '/assets/')}`), translated: Boolean(tr) };
}

export const href = (lang: string, path: string) => localePath(lang, path);
export const fmtDate = (lang: string, iso: string) =>
  new Date(iso).toLocaleDateString(localeOf(lang).intl, { year: 'numeric', month: 'long', day: 'numeric' });
export const fmtNum = (lang: string, n: number) => n.toLocaleString(localeOf(lang).intl);
export const bundleLabel = (t: T, b: Bundle) => t(`bundle.${bundleKey(b)}`);

const engineNames = (a: Asset) => {
  const names = (a.engines as string[]).filter((e) => e in ENGINES).map((e) => ENGINES[e as EngineKey].name.replace(' Engine', ''));
  return names.length ? names : ['Unity', 'Godot', 'Unreal'];
};

/** Localized <title> for a pack page, keyword first. */
export function packSeoTitle(t: T, a: Asset) {
  const engines = engineNames(a).slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' & $1');
  const px = a.series === '3d-pixel';
  const n = a.modelCount ?? '';
  const full = t(px ? 'pack.titlePx' : 'pack.titleLp', { title: a.title, n, engines });
  return full.length <= 72 ? full : t(px ? 'pack.titlePxShort' : 'pack.titleLpShort', { title: a.title, n });
}

/** Localized meta description for a pack page. */
export function packSeoDescription(t: T, lang: string, a: Asset) {
  const short = packText(lang, a).short.replace(/[.。]$/, '');
  const formats = (a.formats as string[]).filter((f) => f !== 'PNG').slice(0, 3).join('/') || 'GLB/FBX/OBJ';
  const price = a.originalPrice && a.originalPriceValue > a.priceValue ? `${a.price} (-${a.sale?.rate ?? 50}%)` : a.price;
  const d = t('pack.desc', { short, formats, price });
  return d.length > 170 ? t('pack.descShort', { short, formats, price }) : d;
}
