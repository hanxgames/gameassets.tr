/**
 * Reads public data from a creator's itch.io store pages.
 * Only pages under https://<user>.itch.io/ are accepted; images stay on the store CDN.
 */
import sanitizeHtml from 'sanitize-html';

const UA = 'Mozilla/5.0 (compatible; GameAssetsTr/1.0; +https://gameassets.tr)';
export const USER_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,120}$/;

export function parseStoreUrl(input) {
  let u;
  try {
    u = new URL(String(input || '').trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().match(/^([a-z0-9][a-z0-9_-]*)\.itch\.io$/);
  const slug = u.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!host || !SLUG_RE.test(slug)) return null;
  return { user: host[1], slug, url: `https://${host[1]}.itch.io/${slug}` };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, type = 'text', tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (res.status === 404) {
        const e = new Error('not-found');
        e.code = 404;
        throw e;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return type === 'json' ? await res.json() : await res.text();
    } catch (e) {
      last = e;
      if (e.code === 404) throw e;
      await sleep(1200 * (i + 1));
    }
  }
  throw last;
}

const decode = (s = '') =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const strip = (s = '') => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const meta = (html, key) =>
  decode(
    (html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${key}"`)) ||
      html.match(new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]+content="([^"]*)"`)) ||
      [])[1] || '',
  );
const money = (s) => (s ? Number(String(s).replace(/[^0-9.]/g, '')) || 0 : 0);

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

function cleanDescription(html) {
  const clean = sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'hr', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      h1: 'h2',
      h2: 'h3',
      a: (tag, attribs) => ({ tagName: 'a', attribs: { href: attribs.href, rel: 'nofollow ugc noopener', target: '_blank' } }),
    },
    exclusiveFilter: (frame) => (frame.tag === 'p' || frame.tag === 'a') && !frame.text.trim(),
  });
  return clean.trim().slice(0, 60000);
}

const CATEGORY_HINTS = [
  ['fonts', /\bfonts?\b|typeface/],
  ['audio', /\b(music|sound|sfx|audio|soundtrack|ambience|ambient)\b/],
  ['ui', /\b(gui|ui|user-interface|interface|icons?|hud)\b/],
  ['vfx', /\b(vfx|particles?|effects?|explosion)\b/],
  ['shaders', /\b(shaders?|materials?|textures?|pbr)\b/],
  ['tools', /\b(tools?|plugins?|addons?|add-ons?|scripts?|editor)\b/],
  ['2d', /\b(2d|sprites?|pixel-art|pixel art|tilesets?|tiles?|spritesheets?|backgrounds?)\b/],
  ['3d', /\b(3d|low-poly|low poly|models?|voxel|fbx|glb|blender)\b/],
];
export function guessCategory(tags, text) {
  const t = tags.join(' ').toLowerCase();
  for (const [k, re] of CATEGORY_HINTS) if (re.test(t)) return k;
  const hay = String(text).toLowerCase();
  for (const [k, re] of CATEGORY_HINTS) if (re.test(hay)) return k;
  return '3d';
}

/** Reads one store page and returns everything the listing needs. */
export async function readPack(user, slug) {
  const base = `https://${user}.itch.io/${slug}`;
  const [html, data] = await Promise.all([get(base), get(`${base}/data.json`, 'json')]);
  if (!data || !data.id) throw new Error('not-a-store-page');
  const desc = innerDiv(html, 'formatted_description');
  const shotList = innerDiv(html, 'screenshot_list');
  const shots = [];
  for (const m of shotList.matchAll(/<a[^>]+href="(https:\/\/img\.itch\.zone\/[^"]+)"[^>]*>([^]*?)<\/a>/g)) {
    const big = (m[2].match(/(https:\/\/img\.itch\.zone\/[^"\s]+\/794x1000\/[^"\s]+)/) || [])[1];
    const small = (m[2].match(/src="(https:\/\/img\.itch\.zone\/[^"]+)"/) || [])[1];
    shots.push({ src: decode(big || m[1]), sm: decode(small || big || m[1]), full: decode(m[1]) });
  }
  if (!shots.length && Array.isArray(data.screenshots))
    for (const s of data.screenshots) shots.push({ src: s, sm: s, full: s });
  const coverFull = meta(html, 'og:image') || data.cover_image || shots[0]?.full || '';
  const tags = Array.isArray(data.tags) ? data.tags.map((t) => String(t).toLowerCase()).slice(0, 12) : [];
  const author = (data.authors && data.authors[0]) || {};
  const published = (html.match(/<td>Published<\/td><td><abbr title="([^"]+)"/) || [])[1];
  const toISO = (s) => {
    const d = s ? new Date(s.replace(' @ ', ' ')) : null;
    return d && !isNaN(d) ? d.toISOString() : null;
  };
  const short = (meta(html, 'og:description') || meta(html, 'description') || strip(desc).slice(0, 180)).slice(0, 200);
  const title = decode(String(data.title || slug)).trim().slice(0, 80);
  return {
    storeId: String(data.id),
    storeUser: user,
    storeSlug: slug,
    storeUrl: base,
    buyUrl: `${base}/purchase`,
    authorName: decode(author.name || user).slice(0, 60),
    title,
    short,
    descriptionHtml: cleanDescription(desc),
    tags,
    suggestedCategory: guessCategory(tags, `${title} ${short}`),
    price: data.price || 'Free',
    priceValue: money(data.price),
    originalPrice: data.original_price || null,
    originalPriceValue: money(data.original_price) || money(data.price),
    free: !money(data.price),
    sale: data.sale
      ? {
          rate: Number(data.sale.rate) || null,
          ends: data.sale.end_date ? new Date(data.sale.end_date.replace(' ', 'T') + 'Z').toISOString() : null,
        }
      : null,
    cover: { src: coverFull, sm: data.cover_image || coverFull },
    screenshots: shots.slice(0, 16).map(({ src, sm }) => ({ src, sm })),
    published: toISO(published),
  };
}

/** Public profile page: used to verify ownership with a one-time code. */
export async function readProfile(user) {
  const html = await get(`https://${user}.itch.io/`);
  const name = decode((html.match(/<title>([^<]*?)\s*-\s*itch\.io<\/title>/) || [])[1] || user).trim();
  const avatar = (html.match(/class="avatar"[^>]*style="background-image:\s*url\('?([^')]+)'?\)/) || [])[1] || '';
  return { html, name, avatar };
}
