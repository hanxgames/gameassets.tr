// Loaded only when the comments section scrolls near: keeps Firebase off the critical path.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc, writeBatch, deleteDoc, getDoc,
  serverTimestamp, connectFirestoreEmulator,
} from 'firebase/firestore';
import { FIREBASE } from '../data/firebase.config.mjs';

export function mount(box: HTMLElement) {
  const S = JSON.parse(box.dataset.strings || '{}') as Record<string, string>;
  const t = (k: string, v: Record<string, string | number> = {}) => (S[k] ?? k).replace(/\{(\w+)\}/g, (m, x) => (x in v ? String(v[x]) : m));
  const slug = box.dataset.slug!;
  const lang = box.dataset.lang || 'en';
  const app = getApps()[0] ?? initializeApp(FIREBASE);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (location.hostname === 'localhost' && sessionStorage.getItem('ga_emu')) {
    try { connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080); } catch {}
  }
  const q = <T extends HTMLElement>(sel: string) => box.querySelector(sel) as T;
  const list = q<HTMLOListElement>('[data-c-list]');
  const form = q<HTMLFormElement>('[data-c-form]');
  const msg = q<HTMLElement>('[data-c-msg]');
  const google = q<HTMLButtonElement>('[data-c-google]');
  const emailLink = q<HTMLElement>('[data-c-email]');
  const ta = form.querySelector('textarea')!;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const ago = (d: Date) => {
    const s = (d.getTime() - Date.now()) / 1000;
    const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, 'second'], [3600, 'minute'], [86400, 'hour'], [2592000, 'day'], [31536000, 'month'], [Infinity, 'year']];
    const div = [1, 60, 3600, 86400, 2592000, 31536000];
    const i = steps.findIndex(([lim]) => Math.abs(s) < lim);
    return rtf.format(Math.round(s / div[i]), steps[i][1]);
  };
  const say = (m: string) => { msg.textContent = m; };
  let displayName = '';

  google.addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()).catch((e) => say(t('social.error', { msg: e.code || e.message }))));
  q<HTMLButtonElement>('[data-c-out]').addEventListener('click', () => signOut(auth));

  onAuthStateChanged(auth, async (user) => {
    google.hidden = Boolean(user);
    emailLink.hidden = Boolean(user);
    form.hidden = !user;
    say('');
    if (!user) return;
    displayName = (user.displayName || '').trim();
    try {
      const c = await getDoc(doc(db, 'creators', user.uid));
      if (c.exists()) displayName = c.data().displayName || displayName;
    } catch {}
    if (!displayName) displayName = t('social.member');
    q<HTMLElement>('[data-c-as]').textContent = t('social.as', { name: displayName });
    if (!user.emailVerified) say(t('social.verifyEmail'));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const text = ta.value.trim().slice(0, 1000);
    if (!user || !text) return;
    const btn = form.querySelector('button[type=submit]') as HTMLButtonElement;
    btn.disabled = true;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'commentGuards', user.uid), { at: serverTimestamp() });
      batch.set(doc(collection(db, 'comments')), { slug, uid: user.uid, name: displayName.slice(0, 60), text, createdAt: serverTimestamp() });
      await batch.commit();
      ta.value = '';
      say('');
    } catch (err: any) {
      say(err?.code === 'permission-denied' ? (user.emailVerified ? t('social.tooFast') : t('social.verifyEmail')) : t('social.error', { msg: err?.code || err?.message }));
    } finally {
      btn.disabled = false;
    }
  });

  let last: any = null;
  const render = () => {
    const snap = last;
    if (!snap) return;
    list.replaceChildren();
    if (snap.empty) {
      const li = document.createElement('li');
      li.className = 'small';
      li.textContent = t('social.noComments');
      list.append(li);
      return;
    }
    for (const d of snap.docs) {
      const c = d.data();
      const li = document.createElement('li');
      li.className = 'c';
      const head = document.createElement('div');
      head.className = 'c-head';
      const name = document.createElement('span');
      name.className = 'c-name';
      name.textContent = String(c.name || t('social.member'));
      const time = document.createElement('time');
      time.className = 'c-time';
      const when = c.createdAt?.toDate ? c.createdAt.toDate() : new Date();
      time.dateTime = when.toISOString();
      time.textContent = ago(when);
      head.append(name, time);
      if (auth.currentUser?.uid === c.uid) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'linkish small';
        del.textContent = t('social.delete');
        del.addEventListener('click', () => deleteDoc(d.ref).catch(() => {}));
        head.append(del);
      }
      const p = document.createElement('p');
      p.className = 'c-text';
      p.textContent = String(c.text || '');
      li.append(head, p);
      list.append(li);
    }
  };
  onAuthStateChanged(auth, () => render());
  onSnapshot(query(collection(db, 'comments'), where('slug', '==', slug), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
    window.dispatchEvent(new CustomEvent('ga:comments', { detail: snap.size }));
    last = snap;
    render();
  }, () => {
    const li = document.createElement('li');
    li.className = 'small';
    li.textContent = t('social.noComments');
    list.replaceChildren(li);
  });
}
