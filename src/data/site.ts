import catalog from './catalog.json';

export type Asset = (typeof catalog.assets)[number];
export type Bundle = (typeof catalog.bundles)[number];

export const SITE = {
  url: 'https://gameassets.tr',
  name: 'GameAssets.tr',
  brand: 'HanX Assets',
  studio: 'HanX Games',
  itch: catalog.profile,
  twitter: '@Hanxgames_',
  twitterUrl: 'https://x.com/Hanxgames_',
  tagline: 'Low Poly & 3D Pixel Game Assets for Unity, Godot & Unreal',
  description:
    'Game-ready low poly and 3D pixel art asset packs for Unity, Godot, Unreal & Blender. One palette, one scale, one draw call. Commercial license, from $0.69.',
};

export const assets: Asset[] = catalog.assets;
export const bundles: Bundle[] = catalog.bundles;
export const syncedAt = catalog.syncedAt;

export const SERIES = {
  'low-poly': {
    slug: 'low-poly',
    name: 'Low Poly',
    title: 'Low Poly 3D Asset Packs',
    seoTitle: 'Low Poly 3D Asset Packs for Unity, Godot & Unreal',
    blurb: 'Modular low poly cities, traffic, villages, schools, SWAT teams and more — all on one palette texture, one scale and one 8 m grid.',
    long: 'The core HanX Assets series: stylized low poly 3D models built to snap together. Every pack shares a single 1024×1024 palette texture and one material, so an entire city scene batches into a single draw call. Perfect for mobile games, prototypes, city builders, driving games, simulators and tactical shooters.',
    accent: '#67fb60',
    emoji: '🏙️',
  },
  '3d-pixel': {
    slug: '3d-pixel',
    name: '3D Pixel',
    title: '3D Pixel Art Asset Packs',
    seoTitle: '3D Pixel Art Asset Packs — Voxel-Style Models for Games',
    blurb: 'Crunchy pixel textures on clean 3D shapes: dungeons, medieval towns, farms, interiors, RPG items and a SWAT squad.',
    long: '3D pixel art (a.k.a. “HD-2D” or pixel-textured low poly) gives you the charm of retro sprites with real 3D lighting and cameras. Each HanX 3D Pixel pack uses point-filtered pixel textures and consistent texel density, so dungeons, towns and props from different packs sit together seamlessly.',
    accent: '#a77bff',
    emoji: '🧱',
  },
  halloween: {
    slug: 'halloween',
    name: 'Halloween',
    title: 'Halloween Low Poly Asset Packs',
    seoTitle: 'Halloween Low Poly 3D Asset Packs — Spooky Game-Ready Models',
    blurb: 'Pumpkins, haunted houses, spooky streets and seasonal props — the full HanX city dressed up for Halloween.',
    long: 'Ship a seasonal update in an afternoon. The Halloween editions re-skin the HanX Assets series with jack-o’-lanterns, cobwebs, gravestones, fog-ready lighting and spooky decorations while keeping the same grid and palette workflow.',
    accent: '#ff8a1f',
    emoji: '🎃',
  },
  christmas: {
    slug: 'christmas',
    name: 'Christmas',
    title: 'Christmas Low Poly Asset Packs',
    seoTitle: 'Christmas Low Poly 3D Asset Packs — Snowy Winter Game Models',
    blurb: 'Snowy rooftops, string lights, Christmas trees and winter props for cozy holiday scenes and seasonal events.',
    long: 'The Christmas editions cover the whole HanX Assets world in snow: glowing string lights, decorated trees, gift boxes, snowmen and winter streets — ideal for holiday events, cozy games and winter levels.',
    accent: '#ff3b6b',
    emoji: '🎄',
  },
} as const;
export type SeriesKey = keyof typeof SERIES;

export const ENGINES = {
  unity: { slug: 'unity', name: 'Unity', title: 'Low Poly 3D Assets for Unity', how: 'Drag the FBX or GLB files into your Assets folder, assign the shared palette material once and drop prefabs into your scene. Works with URP, HDRP and the Built-in pipeline.' },
  godot: { slug: 'godot', name: 'Godot', title: 'Low Poly 3D Assets for Godot 4', how: 'Godot 4 imports GLB natively: copy the files into res://, double-click to create inherited scenes and you are done. One material means great performance on mobile and web exports.' },
  unreal: { slug: 'unreal', name: 'Unreal Engine', title: 'Low Poly 3D Assets for Unreal Engine 5', how: 'Import the FBX files with “Combine Meshes” off, create one material instance from the palette texture and reuse it for every mesh. Nanite is not needed — the models are already tiny.' },
  blender: { slug: 'blender', name: 'Blender', title: 'Low Poly 3D Models for Blender', how: 'Open the included .blend file: every model is already marked as an Asset, so the whole pack shows up in Blender’s Asset Browser ready to drag into your scenes and renders.' },
} as const;
export type EngineKey = keyof typeof ENGINES;

export const seriesOrder: SeriesKey[] = ['low-poly', '3d-pixel', 'halloween', 'christmas'];

export const totalModels = assets.reduce((n, a) => n + (a.modelCount || 0), 0);
export const minPrice = Math.min(...assets.map((a) => a.priceValue).filter((v) => v > 0));

export const bySeries = (s: string) => assets.filter((a) => a.series === s);
export const byEngine = (e: string) => assets.filter((a) => (a.engines as string[]).includes(e));
export const assetBySlug = (s: string) => assets.find((a) => a.slug === s);
export const bundlesFor = (a: Asset) => bundles.filter((b) => b.members.includes(a.slug));
export const membersOf = (b: Bundle) => b.members.map(assetBySlug).filter(Boolean) as Asset[];

export const fmtUSD = (v: number) => `$${v.toFixed(2)}`;

export function bundleName(b: Bundle) {
  const t = b.title;
  if (/halloween/i.test(t)) return 'Halloween Mega Bundle';
  if (/christmas/i.test(t)) return 'Christmas Mega Bundle';
  if (/pixel/i.test(t)) return '3D Pixel Mega Bundle';
  return 'Low Poly Starter Bundle';
}
export function bundleSeries(b: Bundle): SeriesKey {
  const t = b.title;
  if (/halloween/i.test(t)) return 'halloween';
  if (/christmas/i.test(t)) return 'christmas';
  if (/pixel/i.test(t)) return '3d-pixel';
  return 'low-poly';
}
export const bundleSavings = (b: Bundle) =>
  b.regularPriceValue > 0 ? Math.round((1 - b.bundlePriceValue / b.regularPriceValue) * 100) : 0;

const engineList = (a: Asset) => {
  const names = (a.engines as string[])
    .filter((e) => e in ENGINES)
    .map((e) => ENGINES[e as EngineKey].name.replace(' Engine', ''));
  return names.length ? names : ['Unity', 'Godot', 'Unreal'];
};

/** <title> — keyword first, ≤ ~65 chars when possible. */
export function assetSeoTitle(a: Asset) {
  const engines = engineList(a).slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' & $1');
  const count = a.modelCount ? `${a.modelCount} ` : '';
  const kind = a.series === '3d-pixel' ? '3D Pixel Models' : 'Low Poly Models';
  const t = `${a.title}: ${count}${kind} for ${engines}`;
  return t.length <= 70 ? t : `${a.title}: ${count}${kind}`;
}

/** meta description — ~150-160 chars, benefit + proof + price. */
export function assetSeoDescription(a: Asset) {
  const base = a.shortDescription.replace(/\.$/, '');
  const fmts = (a.formats as string[]).filter((f) => f !== 'PNG').slice(0, 3).join('/') || 'GLB/FBX/OBJ';
  const price = a.originalPrice && a.originalPriceValue > a.priceValue ? `${a.price} (-${a.sale?.rate ?? 50}%)` : a.price;
  let d = `${base}. ${fmts}, one texture, commercial license. Only ${price}.`;
  if (d.length > 165) d = `${base}. Game-ready ${fmts}. Only ${price}.`;
  return d;
}

export function absolute(p: string) {
  return new URL(p, SITE.url).toString();
}
