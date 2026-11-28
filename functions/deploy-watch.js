import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';

// Lazy: the app is initialised in index.js, after this module is imported.
const db = { doc: (p) => getFirestore().doc(p) };
// ---------- site rebuilds ----------
// GitHub's own cron runs only every few hours on this repo, so the rebuild check lives here:
// every 5 minutes, start the deploy workflow when the marketplace changed since the last build,
// at the itch.io sync hours chosen in the admin panel (src/data/schedule.json), or every 6 hours
// to refresh rankings. Needs a fine-grained GitHub token (Actions: write, Contents: read).
const GITHUB_DEPLOY_TOKEN = defineSecret('GITHUB_DEPLOY_TOKEN');
const REPO = 'hanxgames/gameassets.tr';
const gh = (path, init = {}) =>
  fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_DEPLOY_TOKEN.value()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'gameassets-deploy-watch',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

export const deployWatch = onSchedule({ region: 'europe-west1', schedule: 'every 5 minutes', timeZone: 'Europe/Istanbul', secrets: [GITHUB_DEPLOY_TOKEN], timeoutSeconds: 60, retryCount: 0 }, async () => {
  const [site, state, runsRes, schedRes] = await Promise.all([
    db.doc('meta/site').get(),
    db.doc('meta/deploy').get(),
    gh('/actions/workflows/deploy.yml/runs?per_page=5'),
    gh('/contents/src/data/schedule.json?ref=main'),
  ]);
  if (!runsRes.ok) { logger.error('runs lookup failed', runsRes.status); return; }
  const runs = (await runsRes.json()).workflow_runs || [];
  const active = runs.some((r) => r.status !== 'completed');
  const lastRun = runs[0] ? Date.parse(runs[0].created_at) : 0;
  const st = state.exists ? state.data() : {};
  const lastBuild = Math.max(lastRun, st.lastDispatchAt?.toMillis?.() || 0);
  const changed = site.get('changedAt')?.toMillis?.() || 0;

  let schedule = {};
  if (schedRes.ok) { try { schedule = JSON.parse(Buffer.from((await schedRes.json()).content, 'base64').toString('utf8')); } catch {} }
  const tr = new Date(Date.now() + 3 * 3600e3);
  const slot = tr.toISOString().slice(0, 13);
  const syncDue = schedule.enabled && (schedule.hoursTR || []).includes(tr.getUTCHours()) && st.lastSyncSlot !== slot;

  let reason = null;
  if (syncDue) reason = 'schedule';
  else if (active) return;
  else if (changed > lastBuild) reason = 'market';
  else if (Date.now() - lastBuild > 6 * 3600e3) reason = 'stats';
  if (!reason) return;

  const res = await gh('/actions/workflows/deploy.yml/dispatches', {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', inputs: { sync: String(reason === 'schedule'), reason } }),
  });
  if (!res.ok) { logger.error('deploy dispatch failed', res.status, await res.text()); return; }
  await db.doc('meta/deploy').set({ lastDispatchAt: FieldValue.serverTimestamp(), reason, ...(reason === 'schedule' ? { lastSyncSlot: slot } : {}) }, { merge: true });
  logger.info('deploy started', { reason });
});

