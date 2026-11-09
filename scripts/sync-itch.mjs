#!/usr/bin/env node
/**
 * Syncs every asset pack and sale bundle from https://hanx-games.itch.io
 * into src/data/catalog.json and downloads optimized WebP images into public/img.
 *
 *   npm run sync
 *
 * Runs weekly in GitHub Actions (.github/workflows/sync.yml), so new packs,
 * price changes and new bundles appear on gameassets.tr automatically.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const USER = 'hanx-games';
const PROFILE = `https://${USER}.itch.io/`;
/** itch pages that are games, not assets — never shown on the site. */
const EXCLUDE = new Set(['rebirth']);
const ROOT = path.resolve(import.meta.dirname, '..');
const IMG_DIR = path.join(ROOT, 'public', 'img', 'assets');
const OG_DIR = path.join(ROOT, 'public', 'og');
const UA = 'Mozilla/5.0 (compatible; gameassets.tr catalog sync)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, type = 'text', tries = 7) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return type === 'json' ? res.json() : type === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep((/^429/.test(e.message) ? 4000 : 800) * (i + 1));
    }
  }
}
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}
const exists = (p) => access(p).then(() => true, () => false);
const decode = (s = '') =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const strip = (s = '') => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);
const meta = (html, key) =>
  decode(
    (html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${key}"`)) ||
      html.match(new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]+content="([^"]*)"`)) ||
      [])[1] || '',
  );
const money = (s) => (s ? Number(String(s).replace(/[^0-9.]/g, '')) : 0);

/** Pull the inner HTML of the first element with the given class (balanced div matching). */
function innerDiv(html, cls) {
  const start = html.indexOf(`class="${cls}`);
  if (start < 0) return '';
  const open = html.indexOf('>', start) + 1;
  let depth = 1;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = open;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index);
  }
  return '';
}

function seriesOf(slug) {
  if (slug.includes('halloween')) return 'halloween';
  if (slug.includes('christmas')) return 'christmas';
  if (slug.includes('japan')) return 'japan';
  if (slug.startsWith('3d-pixel')) return '3d-pixel';
  return 'low-poly';
}

function cleanDescription(html, slugs) {
  let d = html;
  // The site only shows assets: drop studio/game cross-promo lines (e.g. ReBirth).
  d = d.replace(/<p>(?:(?!<\/p>)[^])*?hanx-games\.itch\.io\/rebirth(?:(?!<\/p>)[^])*<\/p>/gi, '');
  d = d.replace(/<(p|li)>(?:(?!<\/\1>)[^])*?\bReBirth\b(?:(?!<\/\1>)[^])*<\/\1>/g, '');
  // Internal links to other packs stay on our site.
  d = d.replace(/href="https:\/\/hanx-games\.itch\.io\/([a-z0-9-]+)"/g, (m, s) =>
    slugs.has(s) ? `href="/assets/${s}/"` : m,
  );
  d = d.replace(/<a /g, '<a rel="noopener" ');
  d = d.replace(/<img[^>]*>/g, '').replace(/<(script|iframe|style)[^]*?<\/\1>/gi, '');
  // Demote headings: the page H1 is the pack title.
  d = d.replace(/<(\/?)h2\b/g, '<$1h3').replace(/<(\/?)h1\b/g, '<$1h2');
  return d.trim();
}

const ENGINES = [
  ['unity', /\bunity\b/i],
  ['godot', /\bgodot\b/i],
  ['unreal', /\bunreal\b/i],
  ['blender', /\bblender\b|\.blend\b/i],
  ['threejs', /three\.js/i],
];
const FORMATS = ['GLB', 'FBX', 'OBJ', 'BLEND', 'GLTF', 'PNG', 'VOX'];

async function processImage(url, dest, width, { animated = false } = {}) {
  if (await exists(dest)) return;
  const buf = await get(url, 'buffer');
  await sharp(buf, { animated })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toFile(dest);
}

async function scrapeAsset(slug, slugs) {
  const base = `https://${USER}.itch.io/${slug}`;
  const [html, data] = await Promise.all([get(base), get(`${base}/data.json`, 'json')]);
  const desc = innerDiv(html, 'formatted_description');
  const text = strip(desc);
  const h2 = strip((desc.match(/<h2[^>]*>([^]*?)<\/h2>/) || [])[1] || '');
  const shortDescription = meta(html, 'description') || meta(html, 'og:description');
  const modelCount =
    Number((h2.match(/(\d[\d,]*)\s+(?:game-ready|low poly|3d|pixel|models)/i) || [])[1]?.replace(/,/g, '')) ||
    Number((shortDescription.match(/^(\d[\d,]*)/) || [])[1]?.replace(/,/g, '')) ||
    null;
  const tri = text.match(/([\d,]+)\s*[–-]\s*([\d,]+)\s*triangles/i);
  const published = (html.match(/<td>Published<\/td><td><abbr title="([^"]+)"/) || [])[1];
  const updated = (html.match(/<td>Updated<\/td><td><abbr title="([^"]+)"/) || [])[1];
  const toISO = (s) => (s ? new Date(s.replace(' @ ', ' ')).toISOString() : null);
  const shotList = innerDiv(html, 'screenshot_list') || html;
  const shots = [...new Set([...shotList.matchAll(/href="(https:\/\/img\.itch\.zone\/[^"]+\/original\/[^"]+)"/g)].map((m) => m[1]))];
  const coverOriginal = meta(html, 'og:image') || data.cover_image;
  const bundles = [...html.matchAll(/class="bundle_title"><a href="https:\/\/itch\.io\/s\/(\d+)\/([^"]+)"/g)].map(
    (m) => ({ id: m[1], path: m[2] }),
  );
  const formats = FORMATS.filter((f) => new RegExp(`\\b${f}\\b`, f === 'BLEND' ? 'i' : '').test(text));
  if (/\.blend\b/i.test(text) && !formats.includes('BLEND')) formats.push('BLEND');

  // Images
  const dir = path.join(IMG_DIR, slug);
  await mkdir(dir, { recursive: true });
  const keep = new Set();
  const img = async (url, w, suffix) => {
    const name = `${hash(url)}${suffix}.webp`;
    keep.add(name);
    await processImage(url, path.join(dir, name), w, { animated: /\.gif/i.test(url) });
    return `/img/assets/${slug}/${name}`;
  };
  const cover = { src: await img(coverOriginal, 1200, ''), sm: await img(coverOriginal, 630, '-sm') };
  const screenshots = [];
  for (const s of shots) screenshots.push({ src: await img(s, 1600, ''), sm: await img(s, 720, '-sm') });
  for (const f of await readdir(dir)) if (!keep.has(f)) await rm(path.join(dir, f));
  const meta1 = await sharp(path.join(ROOT, 'public', cover.src)).metadata();
  cover.width = meta1.width;
  cover.height = meta1.pageHeight || meta1.height;

  return {
    slug,
    id: data.id,
    title: decode(data.title).replace(/\s*-\s*HanX Assets\s*$/i, '').trim(),
    itchTitle: decode(data.title),
    headline: h2,
    shortDescription,
    descriptionHtml: cleanDescription(desc, slugs),
    series: seriesOf(slug),
    modelCount,
    triangles: tri ? { min: Number(tri[1].replace(/,/g, '')), max: Number(tri[2].replace(/,/g, '')) } : null,
    tags: data.tags || [],
    engines: ENGINES.filter(([, re]) => re.test(text)).map(([k]) => k),
    formats,
    price: data.price || 'Free',
    priceValue: money(data.price),
    originalPrice: data.original_price || null,
    originalPriceValue: money(data.original_price) || money(data.price),
    sale: data.sale ? { id: String(data.sale.id), title: decode(data.sale.title), rate: data.sale.rate, ends: data.sale.end_date ? new Date(data.sale.end_date.replace(' ', 'T') + 'Z').toISOString() : null } : null,
    published: toISO(published),
    updated: toISO(updated) || toISO(published),
    url: base,
    buyUrl: `${base}/purchase`,
    bundleIds: bundles.map((b) => b.id),
    bundleRefs: bundles,
    cover,
    screenshots,
  };
}

async function scrapeSale(id, pathPart) {
  const url = `https://itch.io/s/${id}/${pathPart}`;
  const html = await get(url);
  const title = strip((html.match(/<h1 class="promotion_title">([^]*?)<\/h1>/) || [])[1]);
  const bundlePrice = strip((html.match(/class="bundle_price">([^<]+)</) || [])[1]);
  const regular = strip((html.match(/class="buy_summary[^"]*">Regularly <span>([^<]+)</) || [])[1]);
  const rate = Number((html.match(/class="percent_off">(\d+)%/) || [])[1]) || null;
  const description = strip(innerDiv(html, 'promotion_description') || innerDiv(html, 'user_formatted'));
  const members = [...html.matchAll(/href="https:\/\/hanx-games\.itch\.io\/([a-z0-9-]+)"[^>]*class="title game_link"|class="title game_link"[^>]*href="https:\/\/hanx-games\.itch\.io\/([a-z0-9-]+)"/g)].map((m) => m[1] || m[2]);
  return { id, url, title, description, bundlePrice, bundlePriceValue: money(bundlePrice), regularPrice: regular, regularPriceValue: money(regular), rate, members: [...new Set(members)] };
}

function bundleSlug(title) {
  return title
    .toLowerCase()
    .replace(/hanx/g, '')
    .replace(/sale|2026|launch|bundle|3d pixel art|8-pack/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-') || `bundle`;
}

async function ogCollage(covers, dest, { w = 1200, h = 630 } = {}) {
  const cols = 3, rows = 2, gap = 10;
  const cw = Math.floor((w - gap * (cols + 1)) / cols), ch = Math.floor((h - gap * (rows + 1)) / rows);
  const tiles = await Promise.all(
    covers.slice(0, cols * rows).map(async (c, i) => ({
      input: await sharp(path.join(ROOT, 'public', c)).resize(cw, ch, { fit: 'cover' }).toBuffer(),
      left: gap + (i % cols) * (cw + gap),
      top: gap + Math.floor(i / cols) * (ch + gap),
    })),
  );
  await sharp({ create: { width: w, height: h, channels: 3, background: '#070a2e' } })
    .composite(tiles)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest);
}

async function main() {
  console.log('→ reading profile', PROFILE);
  const profile = await get(PROFILE);
  const slugs = [
    ...new Set([...profile.matchAll(/class="title game_link"[^>]*href="https:\/\/hanx-games\.itch\.io\/([a-z0-9-]+)"|href="https:\/\/hanx-games\.itch\.io\/([a-z0-9-]+)"[^>]*class="title game_link"/g)].map((m) => m[1] || m[2])),
  ].filter((s) => !EXCLUDE.has(s));
  // Fallback for markup changes: any game link on the profile.
  if (slugs.length === 0)
    for (const m of profile.matchAll(/href="https:\/\/hanx-games\.itch\.io\/([a-z0-9-]+)"/g)) if (!EXCLUDE.has(m[1]) && !slugs.includes(m[1])) slugs.push(m[1]);
  console.log(`→ ${slugs.length} asset packs`);
  const slugSet = new Set(slugs);
  // If itch rate-limits one page, keep that pack's previous data instead of dropping it.
  const previous = await import(pathToFileURL(path.join(ROOT, 'src', 'data', 'catalog.json')).href, { with: { type: 'json' } })
    .then((m) => m.default.assets || [])
    .catch(() => []);
  const assets = (
    await pool(slugs, 1, async (s) => {
      try {
        const a = await scrapeAsset(s, slugSet);
        console.log(`  ✓ ${a.title} (${a.screenshots.length} shots)`);
        await sleep(400);
        return a;
      } catch (e) {
        const old = previous.find((p) => p.slug === s);
        console.warn(`  ✗ ${s}: ${e.message}${old ? ' — keeping previous data' : ''}`);
        return old || null;
      }
    })
  ).filter(Boolean);

  // Sale bundles
  const salePaths = new Map();
  for (const a of assets) for (const r of a.bundleRefs || []) salePaths.set(r.id, r.path);
  const saleIds = [...salePaths.keys()];
  const bundles = [];
  for (const id of saleIds) {
    const b = await scrapeSale(id, salePaths.get(id) || 'sale');
    const members = b.members.length ? b.members.filter((s) => slugSet.has(s)) : assets.filter((a) => a.bundleIds.includes(id)).map((a) => a.slug);
    if (!members.length || !b.bundlePriceValue) continue;
    const memberAssets = members.map((s) => assets.find((a) => a.slug === s)).filter(Boolean);
    const slug = bundleSlug(b.title);
    await mkdir(OG_DIR, { recursive: true });
    const og = `/og/bundle-${slug}.jpg`;
    await ogCollage(memberAssets.map((a) => a.cover.src), path.join(ROOT, 'public', og));
    const ends = memberAssets.map((a) => a.sale?.id === id && a.sale.ends).find(Boolean) || null;
    bundles.push({
      ...b,
      slug,
      members,
      ends,
      og,
      modelCount: memberAssets.reduce((n, a) => n + (a.modelCount || 0), 0),
    });
    console.log(`  ✓ bundle ${b.title}: ${members.length} packs for ${b.bundlePrice}`);
  }

  await mkdir(OG_DIR, { recursive: true });
  const pick = ['low-poly-swat-pack', 'low-poly-city-pack', '3d-pixel-dungeon-pack', 'low-poly-halloween-city-pack', 'low-poly-christmas-village-pack', '3d-pixel-medieval-town-pack'];
  const homeCovers = pick.map((s) => assets.find((a) => a.slug === s)).filter(Boolean);
  for (const a of assets) if (homeCovers.length < 6 && !homeCovers.includes(a)) homeCovers.push(a);
  await ogCollage(homeCovers.map((a) => a.cover.src), path.join(OG_DIR, 'home.jpg'));

  const catalog = {
    syncedAt: new Date().toISOString(),
    profile: PROFILE,
    assets,
    bundles,
  };
  await writeFile(path.join(ROOT, 'src', 'data', 'catalog.json'), JSON.stringify(catalog, null, 2));
  console.log(`✔ catalog.json: ${assets.length} packs, ${bundles.length} bundles`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
