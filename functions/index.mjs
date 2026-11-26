import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { validateRequest } from './composition.mjs';
import { generateWithGemini } from './gemini.mjs';
initializeApp();
const apiKey = defineSecret('GEMINI_API_KEY');
const model = defineString('PREACHING_AI_MODEL', { default: '' });
const allowedUids = defineString('PREACHING_AI_ALLOWED_UIDS', { default: '' });
// Initial pilot: server-only UID allowlist. Premium test flags never authorize paid AI.
// Do not launch publicly until billing entitlements and App Check have been integrated.
export const generatePreaching = onRequest({ region: 'southamerica-east1', timeoutSeconds: 360, memory: '256MiB', maxInstances: 1, concurrency: 4, cors: false, secrets: [apiKey] }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  if (Number(req.headers['content-length'] ?? 0) > 120000 || Buffer.byteLength(JSON.stringify(req.body ?? {})) > 120000) { res.status(413).json({ error: 'size' }); return; }
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model.value()) || !allowedUids.value().trim()) { res.status(503).json({ error: 'not-configured' }); return; }
  let user;
  try { user = await getAuth().verifyIdToken((req.headers.authorization ?? '').replace(/^Bearer /, ''), true); }
  catch { res.status(401).json({ error: 'auth' }); return; }
  if (!allowedUids.value().split(',').map(x => x.trim()).includes(user.uid)) { res.status(403).json({ error: 'access' }); return; }
  let request;
  try { request = validateRequest(req.body); } catch { res.status(400).json({ error: 'input' }); return; }
  const db = getFirestore(); const day = new Date().toISOString().slice(0,10);
  const quota = db.doc(`aiGenerationQuotas/${day}/users/${user.uid}`); const global = db.doc(`aiGenerationQuotas/${day}`);
  try {
    await db.runTransaction(async tx => {
      const [personal, total] = await Promise.all([tx.get(quota), tx.get(global)]);
      if ((personal.data()?.count ?? 0) >= 2 || (total.data()?.count ?? 0) >= 10) throw Error('quota');
      tx.set(quota, { count: (personal.data()?.count ?? 0) + 1 }); tx.set(global, { count: (total.data()?.count ?? 0) + 1 });
    });
  } catch { res.status(429).json({ error: 'quota' }); return; }
  try {
    const outline = await generateWithGemini({ outline: request.outline, duration: request.duration, model: model.value(), apiKey: apiKey.value() });
    res.status(200).json({ outline });
  } catch (reason) {
    res.status(reason?.message === 'provider-quota' ? 429 : 502).json({ error: reason?.message === 'provider-quota' ? 'provider-quota' : 'generation-failed' });
  }
});
