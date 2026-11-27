/**
 * GameAssets.tr Cloud Functions
 *
 *  createProfile   pick a unique handle and create the creator profile
 *  startVerify     issue a one-time code for the creator's store profile
 *  checkVerify     confirm the code is on the store profile and link it
 *  previewPack     read a store page the creator owns (no write)
 *  publishPack     list that store page on the site
 *  refreshPack     re-read price, sale and images for one of the creator's packs
 *  onPackWritten / onCreatorWritten   flag the site for a rebuild, keep counters, enforce bans
 *  nightly         refresh prices for the oldest listings and prune old daily stats
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { randomBytes } from 'node:crypto';
import { parseStoreUrl, readPack, readProfile, USER_RE } from './store.js';

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10, memory: '256MiB' });

const CATEGORIES = ['3d', '2d', 'ui', 'audio', 'vfx', 'shaders', 'fonts', 'tools'];
const RESERVED_HANDLES = new Set([
  'hanx-games', 'hanx', 'admin', 'administrator', 'gameassets', 'game-assets', 'support', 'help', 'about', 'assets',
  'creators', 'creator', 'dashboard', 'join', 'login', 'signup', 'sell', 'search', 'category', 'categories', 'bundles',
  'collections', 'engines', 'faq', 'license', 'privacy', 'terms', 'api', 'static', 'staff', 'team', 'official',
]);
/** Store profiles whose packs the site already imports itself. */
const RESERVED_STORE_USERS = new Set(['hanx-games']);
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
const MAX_PACKS = 300;
const opts = { cors: true, enforceAppCheck: false, timeoutSeconds: 60, invoker: 'public' };

// ---------- helpers ----------
function requireUser(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'sign-in-required');
  return req.auth;
}
async function requireCreator(req, { verified = true, active = true } = {}) {
  const auth = requireUser(req);
  const snap = await db.doc(`creators/${auth.uid}`).get();
  if (!snap.exists) throw new HttpsError('failed-precondition', 'no-profile');
  const c = snap.data();
  if (c.status === 'banned' || c.status === 'suspended') throw new HttpsError('permission-denied', 'account-' + c.status);
  if (active && c.status !== 'active') throw new HttpsError('permission-denied', 'account-' + c.status);
  if (verified && !c.verified) throw new HttpsError('failed-precondition', 'store-not-verified');
  if (verified && auth.token.email_verified !== true) throw new HttpsError('failed-precondition', 'email-not-verified');
  return { auth, creator: c };
}
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanTags = (tags) =>
  [...new Set((Array.isArray(tags) ? tags : String(tags || '').split(','))
    .map((t) => clean(t, 30).toLowerCase().replace(/[^a-z0-9 +#.-]/g, '').trim())
    .filter(Boolean))].slice(0, 12);
const touchSite = (reason) => db.doc('meta/site').set({ changedAt: FieldValue.serverTimestamp(), reason }, { merge: true });

function storeError(e) {
  if (e instanceof HttpsError) return e;
  if (e && e.code === 404) return new HttpsError('not-found', 'store-page-not-found');
  if (e && e.message === 'not-a-store-page') return new HttpsError('invalid-argument', 'not-a-store-page');
  logger.warn('store read failed', e?.message);
  return new HttpsError('unavailable', 'store-unreachable');
}

function storeFields(p) {
  const { suggestedCategory, ...rest } = p;
  return rest;
}

// ---------- profile ----------
export const createProfile = onCall(opts, async (req) => {
  const auth = requireUser(req);
  const handle = clean(req.data?.handle, 30).toLowerCase();
  const displayName = clean(req.data?.displayName, 60);
  if (!HANDLE_RE.test(handle) || handle.includes('--')) throw new HttpsError('invalid-argument', 'bad-handle');
  if (RESERVED_HANDLES.has(handle)) throw new HttpsError('already-exists', 'handle-taken');
  if (displayName.length < 2) throw new HttpsError('invalid-argument', 'bad-name');
  const creatorRef = db.doc(`creators/${auth.uid}`);
  const handleRef = db.doc(`handles/${handle}`);
  await db.runTransaction(async (tx) => {
    const [c, h] = await Promise.all([tx.get(creatorRef), tx.get(handleRef)]);
    if (c.exists) throw new HttpsError('already-exists', 'profile-exists');
    if (h.exists) throw new HttpsError('already-exists', 'handle-taken');
    tx.create(handleRef, { uid: auth.uid });
    tx.create(creatorRef, {
      handle,
      displayName,
      bio: '',
      website: '',
      twitter: '',
      avatar: '',
      status: 'active',
      verified: false,
      storeUser: null,
      packCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { handle };
});

// ---------- store verification ----------
export const startVerify = onCall(opts, async (req) => {
  const { auth, creator } = await requireCreator(req, { verified: false, active: false });
  if (creator.verified) throw new HttpsError('failed-precondition', 'already-verified');
  const user = clean(req.data?.storeUser, 63).toLowerCase().replace(/^https?:\/\//, '').replace(/\.itch\.io.*$/, '');
  if (!USER_RE.test(user)) throw new HttpsError('invalid-argument', 'bad-store-user');
  if (RESERVED_STORE_USERS.has(user)) throw new HttpsError('already-exists', 'store-claimed');
  const claimed = await db.doc(`storeUsers/${user}`).get();
  if (claimed.exists && claimed.data().uid !== auth.uid) throw new HttpsError('already-exists', 'store-claimed');
  const code = 'GA-' + randomBytes(4).toString('hex').toUpperCase();
  await db.doc(`creators/${auth.uid}/private/verify`).set({ storeUser: user, code, createdAt: FieldValue.serverTimestamp() });
  return { storeUser: user, code };
});

export const checkVerify = onCall(opts, async (req) => {
  const { auth, creator } = await requireCreator(req, { verified: false, active: false });
  if (creator.verified) return { verified: true, storeUser: creator.storeUser };
  const v = (await db.doc(`creators/${auth.uid}/private/verify`).get()).data();
  if (!v) throw new HttpsError('failed-precondition', 'no-code');
  let profile;
  try {
    profile = await readProfile(v.storeUser);
  } catch (e) {
    throw storeError(e);
  }
  if (!profile.html.includes(v.code)) return { verified: false };
  const userRef = db.doc(`storeUsers/${v.storeUser}`);
  await db.runTransaction(async (tx) => {
    const u = await tx.get(userRef);
    if (u.exists && u.data().uid !== auth.uid) throw new HttpsError('already-exists', 'store-claimed');
    tx.set(userRef, { uid: auth.uid, at: FieldValue.serverTimestamp() });
    tx.update(db.doc(`creators/${auth.uid}`), {
      verified: true,
      storeUser: v.storeUser,
      storeName: profile.name,
      avatar: profile.avatar || creator.avatar || '',
      verifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { verified: true, storeUser: v.storeUser };
});

// ---------- packs ----------
function ownedStoreUrl(creator, url) {
  const p = parseStoreUrl(url);
  if (!p) throw new HttpsError('invalid-argument', 'bad-url');
  if (p.user !== creator.storeUser) throw new HttpsError('permission-denied', 'not-your-store');
  return p;
}

export const previewPack = onCall(opts, async (req) => {
  const { creator } = await requireCreator(req);
  const p = ownedStoreUrl(creator, req.data?.url);
  const dupe = await db.collection('packs').where('storeUser', '==', p.user).where('storeSlug', '==', p.slug).limit(1).get();
  if (!dupe.empty) throw new HttpsError('already-exists', 'already-listed');
  try {
    return await readPack(p.user, p.slug);
  } catch (e) {
    throw storeError(e);
  }
});

export const publishPack = onCall(opts, async (req) => {
  const { auth, creator } = await requireCreator(req);
  const p = ownedStoreUrl(creator, req.data?.url);
  const category = CATEGORIES.includes(req.data?.category) ? req.data.category : null;
  if (!category) throw new HttpsError('invalid-argument', 'bad-category');
  const count = await db.collection('packs').where('ownerUid', '==', auth.uid).count().get();
  if (count.data().count >= MAX_PACKS) throw new HttpsError('resource-exhausted', 'too-many-packs');
  let data;
  try {
    data = await readPack(p.user, p.slug);
  } catch (e) {
    throw storeError(e);
  }
  const id = `${creator.handle}-${p.slug}`.slice(0, 120).replace(/-+$/, '');
  const ref = db.doc(`packs/${id}`);
  const title = clean(req.data?.title, 80) || data.title;
  const short = clean(req.data?.short, 200) || data.short;
  const tags = req.data?.tags != null ? cleanTags(req.data.tags) : data.tags;
  await db.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    if (cur.exists) throw new HttpsError('already-exists', 'already-listed');
    tx.create(ref, {
      ...storeFields(data),
      title: title.length >= 2 ? title : data.title,
      short,
      tags,
      category,
      ownerUid: auth.uid,
      creatorHandle: creator.handle,
      creatorName: creator.displayName,
      status: 'published',
      ownerHidden: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      refreshedAt: FieldValue.serverTimestamp(),
    });
  });
  return { id };
});

export const refreshPack = onCall(opts, async (req) => {
  const { auth } = await requireCreator(req);
  const id = clean(req.data?.id, 120);
  const ref = db.doc(`packs/${id}`);
  const snap = await ref.get();
  if (!snap.exists || snap.data().ownerUid !== auth.uid) throw new HttpsError('not-found', 'pack-not-found');
  const cur = snap.data();
  let data;
  try {
    data = await readPack(cur.storeUser, cur.storeSlug);
  } catch (e) {
    throw storeError(e);
  }
  const { title, short, tags, ...store } = storeFields(data);
  await ref.update({ ...store, refreshedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

// ---------- triggers ----------
export const onPackWritten = onDocumentWritten('packs/{id}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  const owner = (after || before)?.ownerUid;
  if (owner && (!before || !after)) {
    const n = await db.collection('packs').where('ownerUid', '==', owner).count().get();
    await db.doc(`creators/${owner}`).set({ packCount: n.data().count }, { merge: true });
  }
  // Price refreshes that change nothing visible do not need a rebuild.
  const visible = ['title', 'short', 'category', 'tags', 'status', 'ownerHidden', 'price', 'originalPrice', 'sale', 'cover', 'screenshots', 'descriptionHtml', 'featured'];
  if (!before || !after || visible.some((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))) await touchSite('pack');
});

export const onCreatorWritten = onDocumentWritten('creators/{uid}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  const uid = event.params.uid;
  if (after && before?.status !== after.status) {
    const disable = after.status === 'banned';
    await getAuth().updateUser(uid, { disabled: disable }).catch((e) => logger.warn('auth update failed', e.message));
  }
  const visible = ['displayName', 'bio', 'website', 'twitter', 'avatar', 'status', 'verified', 'featured', 'handle'];
  if (!before || !after || visible.some((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))) await touchSite('creator');
});

// ---------- schedule ----------
export const nightly = onSchedule({ schedule: 'every 2 hours', timeZone: 'Europe/Istanbul', timeoutSeconds: 540 }, async () => {
  const started = Date.now();
  const snap = await db.collection('packs').orderBy('refreshedAt', 'asc').limit(120).get();
  let ok = 0, gone = 0;
  for (const doc of snap.docs) {
    if (Date.now() - started > 480000) break;
    const cur = doc.data();
    if (cur.status === 'deleted') continue;
    try {
      const data = await readPack(cur.storeUser, cur.storeSlug);
      const { title, short, tags, ...store } = storeFields(data);
      await doc.ref.update({ ...store, storeMissing: FieldValue.delete(), refreshedAt: FieldValue.serverTimestamp() });
      ok++;
    } catch (e) {
      // A page that disappeared from the store is hidden until it comes back.
      await doc.ref.update({ storeMissing: e?.code === 404 ? true : cur.storeMissing || false, refreshedAt: FieldValue.serverTimestamp() });
      if (e?.code === 404) gone++;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Keep 35 days of daily counters.
  const cutoff = Math.floor(Date.now() / 864e5) - 35;
  const hour = new Date().getUTCHours();
  if (hour < 2) {
    const stats = await db.collection('stats').get();
    let batch = db.batch(), n = 0;
    for (const s of stats.docs) {
      const d = s.data().d || {};
      const old = Object.keys(d).filter((k) => Number(k) < cutoff);
      if (!old.length) continue;
      const args = old.flatMap((k) => [new FieldPath('d', k), FieldValue.delete()]);
      batch.update(s.ref, ...args);
      if (++n % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    await batch.commit();
  }
  logger.info(`refreshed ${ok}, missing ${gone}`);
});
// 1795773669
