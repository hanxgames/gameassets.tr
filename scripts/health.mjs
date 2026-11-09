#!/usr/bin/env node
/**
 * Site health check for gameassets.tr. Prints a JSON report to stdout:
 * every sitemap URL, every pack image, every itch.io pack page, and packs on the
 * itch.io profile that the site does not show yet.
 */
import { readFile } from 'node:fs/promises';

const SITE = 'https://gameassets.tr';
const PROFILE = 'https://hanx-games.itch.io/';
const UA = 'Mozilla/5.0 (compatible; gameassets.tr health check)';
const started = Date.now();
const problems = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function status(url, { method = 'HEAD', tries = 3 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method, headers: { 'user-agent': UA }, redirect: 'follow' });
      if (res.status === 429 || res.status >= 500) { await sleep(res.status === 429 ? 5000 : 0); throw new Error(String(res.status)); }
      return res;
    } catch (e) {
      if (i === tries - 1) return { status: Number(e.message) || 0, ok: false, text: async () => '' };
      await sleep(1500 * (i + 1));
    }
  }
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url), 'utf8'));
const hidden = new Set(JSON.parse(await readFile(new URL('../src/data/hidden.json', import.meta.url), 'utf8')));

// 1. Every page in the sitemap
const sitemap = await (await fetch(`${SITE}/sitemap-0.xml`, { headers: { 'user-agent': UA } })).text();
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
await pool(pages, 8, async (url) => {
  const res = await status(url);
  if (!res.ok) problems.push({ type: 'page', url, status: res.status });
});

// 2. Every image of every visible pack
const images = catalog.assets
  .filter((a) => !hidden.has(a.slug))
  .flatMap((a) => [a.cover, ...a.screenshots].flatMap((g) => [g.src, g.sm]).map((src) => ({ slug: a.slug, url: `${SITE}${src}` })));
await pool(images, 8, async ({ slug, url }) => {
  const res = await status(url);
  if (!res.ok) problems.push({ type: 'image', slug, url, status: res.status });
});

// 3. Every itch.io pack page still exists (slowly, itch rate-limits; a rate-limited check is "skipped", not a problem)
const skipped = [];
for (const a of catalog.assets) {
  const res = await status(a.url, { method: 'GET', tries: 4 });
  if (res.status === 429) skipped.push({ type: 'itch', slug: a.slug, url: a.url, status: 429 });
  else if (!res.ok) problems.push({ type: 'itch', slug: a.slug, url: a.url, status: res.status });
  await sleep(2000);
}

// 4. Packs on the itch.io profile that the site does not have yet
let newOnItch = [];
try {
  const profile = await (await status(PROFILE, { method: 'GET' })).text();
  const onItch = new Set([...profile.matchAll(/class="title game_link"[^>]*href="https:\/\/hanx-games\.itch\.io\/([a-z0-9-]+)"|href="https:\/\/hanx-games\.itch\.io\/([a-z0-9-]+)"[^>]*class="title game_link"/g)].map((m) => m[1] || m[2]));
  const known = new Set(catalog.assets.map((a) => a.slug));
  newOnItch = [...onItch].filter((s) => !known.has(s) && s !== 'rebirth');
} catch {
  problems.push({ type: 'itch-profile', url: PROFILE, status: 0 });
}

process.stdout.write(JSON.stringify({
  checkedAt: new Date().toISOString(),
  durationSec: Math.round((Date.now() - started) / 1000),
  counts: { pages: pages.length, images: images.length, itch: catalog.assets.length },
  problems,
  skipped,
  newOnItch,
}, null, 2));
