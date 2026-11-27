#!/usr/bin/env node
/**
 * Reads the public marketplace data (creators, packs, view/click stats) from
 * Firestore and writes src/data/market.json for the static build.
 *
 *   npm run market            (runs before every build in CI)
 *   MARKET_OPTIONAL=1 ...     keep going with the previous file if Firestore is unreachable
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FIREBASE } from '../src/data/firebase.config.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src', 'data', 'market.json');
// FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 reads the local emulator instead (testing).
const EMU = process.env.FIRESTORE_EMULATOR_HOST;
const BASE = `${EMU ? `http://${EMU}` : 'https://firestore.googleapis.com'}/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;

function value(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(value);
  if ('mapValue' in v) return fields(v.mapValue.fields || {});
  return null;
}
const fields = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, value(v)]));

async function list(collection) {
  const out = [];
  let token = '';
  do {
    const url = `${BASE}/${collection}?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${collection}: HTTP ${res.status} ${await res.text()}`);
    const j = await res.json();
    for (const d of j.documents || []) out.push({ id: d.name.split('/').pop(), ...fields(d.fields || {}) });
    token = j.nextPageToken || '';
  } while (token);
  return out;
}

async function main() {
  const [creators, packs, stats] = await Promise.all([list('creators'), list('packs'), list('stats')]);
  const today = Math.floor(Date.now() / 864e5);
  const sumDays = (d = {}, days, key) =>
    Object.entries(d).reduce((n, [k, v]) => (Number(k) > today - days ? n + (Number(v?.[key]) || 0) : n), 0);
  const statMap = Object.fromEntries(
    stats.map((s) => [s.id, { v: s.v || 0, c: s.c || 0, v7: sumDays(s.d, 7, 'v'), c7: sumDays(s.d, 7, 'c'), c30: sumDays(s.d, 30, 'c') }]),
  );
  const publicCreators = creators
    .filter((c) => c.handle && c.status !== 'banned' && c.status !== 'suspended')
    .map((c) => ({
      uid: c.id,
      handle: c.handle,
      name: c.displayName || c.handle,
      bio: c.bio || '',
      website: c.website || '',
      twitter: c.twitter || '',
      avatar: c.avatar || '',
      verified: Boolean(c.verified),
      featured: Boolean(c.featured),
      createdAt: c.createdAt || null,
    }));
  const live = new Set(publicCreators.map((c) => c.uid));
  const publicPacks = packs
    .filter((p) => p.status === 'published' && !p.ownerHidden && !p.storeMissing && live.has(p.ownerUid))
    .map(({ ownerUid, adminNote, refreshedAt, storeMissing, ownerHidden, status, ...p }) => ({ ...p, creatorUid: ownerUid }));
  const data = { fetchedAt: new Date().toISOString(), creators: publicCreators, packs: publicPacks, stats: statMap };
  await writeFile(OUT, JSON.stringify(data, null, 1));
  console.log(`✔ market.json: ${publicCreators.length} creators, ${publicPacks.length} packs, ${stats.length} stat docs`);
}

main().catch(async (e) => {
  console.error('✗ market fetch failed:', e.message);
  if (process.env.MARKET_OPTIONAL) {
    const prev = await readFile(OUT, 'utf8').catch(() => null);
    if (!prev) await writeFile(OUT, JSON.stringify({ fetchedAt: null, creators: [], packs: [], stats: {} }));
    process.exit(0);
  }
  process.exit(1);
});
