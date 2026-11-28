/**
 * The marketplace model: every listing on the site (HanX Games' own packs from
 * catalog.json plus packs creators publish through the dashboard, from market.json),
 * the creators, the categories and the rankings computed from view / click stats.
 */
import market from './market.json';
import featured from './featured.json';
import { SITE, assets as hanxAssets, type Asset } from './site';

export const CATEGORIES = [
  { key: '3d', slug: '3d-models' },
  { key: '2d', slug: '2d-art' },
  { key: 'ui', slug: 'ui' },
  { key: 'audio', slug: 'audio' },
  { key: 'vfx', slug: 'vfx' },
  { key: 'shaders', slug: 'shaders-materials' },
  { key: 'fonts', slug: 'fonts' },
  { key: 'tools', slug: 'tools' },
  { key: 'games', slug: 'games' },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]['key'];
export const categoryBySlug = (s: string) => CATEGORIES.find((c) => c.slug === s);
export const categoryByKey = (k: string) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[0];

export interface Creator {
  uid: string;
  handle: string;
  name: string;
  bio: string;
  website: string;
  twitter: string;
  avatar: string;
  verified: boolean;
  featured: boolean;
  createdAt: string | null;
  /** HanX Games: the house studio with translated copy and collections. */
  house?: boolean;
}

/** A listing is an Asset-shaped record, so the existing cards and pack page render it. */
export type Listing = Asset & {
  community?: boolean;
  category: CategoryKey;
  creator: string;
  createdAt?: string | null;
};

export const HOUSE: Creator = {
  uid: 'hanx-games',
  handle: 'hanx-games',
  name: SITE.studio,
  bio: '',
  website: 'https://hanxgames.net',
  twitter: SITE.twitter.replace('@', ''),
  avatar: '/icon-192.png',
  verified: true,
  featured: false,
  createdAt: '2025-01-01T00:00:00.000Z',
  house: true,
};

type MarketPack = (typeof market.packs)[number] & Record<string, any>;
const houseSlugs = new Set(hanxAssets.map((a) => a.slug));

/** Second line of defence: descriptions are sanitized on import, and again here. */
function cleanHtml(html: string) {
  return String(html || '')
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|svg|math)\b[^]*?(<\/\1\s*>|$)/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|form|input|textarea|svg|math|link|meta|base)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '$1="#"');
}
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const httpsUrl = (v: unknown) => (typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v) ? v : '');

function fromMarket(p: MarketPack): Listing | null {
  if (!/^[a-z0-9][a-z0-9_-]{1,119}$/.test(p.id) || !httpsUrl(p.buyUrl) || !/^https:\/\/[a-z0-9_-]+\.itch\.io\//.test(p.buyUrl)) return null;
  if (houseSlugs.has(p.id)) return null; // never shadow a house URL
  const cover = p.cover || { src: '', sm: '' };
  return {
    slug: p.id,
    id: p.storeId,
    title: str(p.title, 80),
    itchTitle: str(p.title, 80),
    headline: '',
    shortDescription: str(p.short, 200),
    descriptionHtml: cleanHtml(p.descriptionHtml),
    series: null,
    modelCount: null,
    triangles: null,
    tags: (Array.isArray(p.tags) ? p.tags : []).filter((t: unknown) => typeof t === 'string').map((t: string) => t.slice(0, 30)).slice(0, 12),
    engines: [],
    formats: [],
    price: p.free ? 'Free' : p.price,
    priceValue: p.priceValue || 0,
    originalPrice: p.originalPrice && p.originalPriceValue > p.priceValue ? p.originalPrice : null,
    originalPriceValue: p.originalPriceValue || p.priceValue || 0,
    sale: p.sale && p.originalPriceValue > p.priceValue ? { id: '', title: '', rate: p.sale.rate, ends: p.sale.ends } : null,
    published: p.createdAt || p.published || null,
    updated: p.updatedAt || null,
    url: p.storeUrl,
    buyUrl: p.buyUrl,
    bundleIds: [],
    bundleRefs: [],
    cover: { src: httpsUrl(cover.src), sm: httpsUrl(cover.sm) || httpsUrl(cover.src), width: 630, height: 500 },
    screenshots: (p.screenshots || []).map((s: any) => ({ src: httpsUrl(s?.src), sm: httpsUrl(s?.sm) || httpsUrl(s?.src) })).filter((s: any) => s.src),
    community: true,
    category: categoryByKey(p.category).key,
    creator: p.creatorHandle,
    createdAt: p.createdAt || null,
  } as unknown as Listing;
}

const house: Listing[] = hanxAssets.map((a) => ({ ...a, category: '3d', creator: HOUSE.handle }) as Listing);
const community = (market.packs as MarketPack[]).map(fromMarket).filter(Boolean) as Listing[];

export const listings: Listing[] = [...house, ...community];
const cleanCreator = (c: Creator): Creator => ({
  ...c,
  name: str(c.name, 60) || c.handle,
  bio: str(c.bio, 600),
  website: /^https?:\/\/[^\s"'<>]+$/.test(c.website || '') ? c.website : '',
  twitter: str(c.twitter, 40).replace(/[^A-Za-z0-9_]/g, ''),
  avatar: httpsUrl(c.avatar),
});
export const creators: Creator[] = [
  HOUSE,
  ...(market.creators as Creator[]).filter((c) => /^[a-z0-9-]{3,30}$/.test(c.handle) && c.handle !== HOUSE.handle).map(cleanCreator),
];
export const creatorByHandle = (h: string) => creators.find((c) => c.handle === h);
export const listingsBy = (h: string) => listings.filter((l) => l.creator === h);
export const listingBySlug = (s: string) => listings.find((l) => l.slug === s);
export const inCategory = (k: string) => listings.filter((l) => l.category === k);
/** Creators shown publicly: the house plus anyone with at least one live pack. */
export const activeCreators = creators.filter((c) => c.house || listingsBy(c.handle).length > 0);

// ---------- stats & rankings ----------
type Stat = { v: number; c: number; v7: number; c7: number; c30: number };
const stats = market.stats as Record<string, Stat>;
const zero: Stat = { v: 0, c: 0, v7: 0, c7: 0, c30: 0 };
export const statOf = (slug: string) => stats[slug] ?? zero;
const by = (k: keyof Stat) => (a: Listing, b: Listing) => statOf(b.slug)[k] - statOf(a.slug)[k];
const hasAny = (k: keyof Stat) => listings.some((l) => statOf(l.slug)[k] > 0);

const picks = ((featured.rail as string[]) || []).map(listingBySlug).filter(Boolean) as Listing[];
const newestFirst = (a: Listing, b: Listing) => +new Date(b.published ?? 0) - +new Date(a.published ?? 0);

export const newest = [...listings].sort(newestFirst);
export const popular = hasAny('v') ? [...listings].sort(by('v')) : picks.length ? [...picks, ...newest.filter((l) => !picks.includes(l))] : newest;
export const mostClicked = hasAny('c') ? [...listings].sort((a, b) => statOf(b.slug).c30 - statOf(a.slug).c30 || statOf(b.slug).c - statOf(a.slug).c) : [];
export const freeListings = listings.filter((l) => !l.priceValue);
export const paidListings = listings.filter((l) => l.priceValue > 0);

export const assetOfWeek: Listing =
  (hasAny('v7') ? [...listings].sort(by('v7'))[0] : null) ??
  listingBySlug((featured as any).heroPack) ??
  listings[0];

function creatorScore(c: Creator, k: keyof Stat) {
  return listingsBy(c.handle).reduce((n, l) => n + statOf(l.slug)[k], 0);
}
export const creatorOfWeek: Creator = (() => {
  const pool = activeCreators.filter((c) => !c.house);
  const scored = [...(pool.length ? pool : activeCreators)].sort((a, b) => creatorScore(b, 'v7') - creatorScore(a, 'v7') || creatorScore(b, 'v') - creatorScore(a, 'v'));
  return activeCreators.find((c) => c.featured) ?? scored[0] ?? HOUSE;
})();
export const creatorTotals = (c: Creator) => ({
  packs: listingsBy(c.handle).length,
  views: creatorScore(c, 'v'),
  clicks: creatorScore(c, 'c'),
});
export const marketFetchedAt = market.fetchedAt;
