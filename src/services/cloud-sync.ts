import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDocFromServer, getFirestore, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getFirebaseSession } from './firebase-session';
import { localData } from './local-data';
import { agendaReminders } from './agenda-reminders';
import { createCloudSyncService, type CloudCopy, type SyncRemote, type SyncSession } from './cloud-sync-service';
import { MAX_SYNC_BYTES } from './cloud-sync-model';

function reference(session: SyncSession) {
  session.assert(); const auth = getFirebaseSession();
  if (!auth) throw Error('Entre na sua conta para sincronizar.');
  return doc(getFirestore(auth.app), 'users', session.uid, 'sync', 'journey');
}
export function decodeCloudCopy(value: unknown): CloudCopy {
  if (!value || typeof value !== 'object') throw Error('Cópia da nuvem inválida. Nada foi alterado.');
  const row = value as Record<string, unknown>;
  if (row.version !== 1 || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1 || typeof row.payload !== 'string' || row.payload.length > MAX_SYNC_BYTES) throw Error('Cópia da nuvem inválida ou incompatível. Nada foi alterado.');
  return { revision: Number(row.revision), payload: row.payload };
}
const remote: SyncRemote = {
  session() {
    const auth = getFirebaseSession(); const user = auth?.currentUser;
    if (!auth || !user) throw Error('Entre na sua conta para sincronizar.');
    return { uid: user.uid, assert() { if (auth.currentUser !== user) throw Error('Sua conta mudou. Confira uma nova prévia para continuar.'); } };
  },
  async read(session) {
    return networkOperation(async active => {
      const snapshot = await getDocFromServer(reference(session)); active(); session.assert();
      return snapshot.exists() ? decodeCloudCopy(snapshot.data()) : null;
    });
  },
  async write(session, expected, payload) {
    const ref = reference(session);
    return networkOperation(active => runTransaction(ref.firestore, async transaction => {
      active(); session.assert(); const snapshot = await transaction.get(ref); active(); session.assert();
      const previous = snapshot.exists() ? decodeCloudCopy(snapshot.data()) : null;
      if ((previous?.revision ?? 0) !== expected) throw Error('Outro aparelho sincronizou depois da sua prévia. Confira novamente para combinar as alterações.');
      if (previous?.payload === payload) return previous.revision;
      const revision = expected + 1;
      transaction.set(ref, { version: 1, revision, payload, updatedAt: serverTimestamp() });
      return revision;
    }, { maxAttempts: 3 }));
  },
};
async function networkOperation<T>(operation: (active: () => void) => Promise<T>): Promise<T> {
  let active = true; let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutError = () => Object.assign(Error('Não foi possível confirmar a conexão. Confira novamente; seus dados continuam neste aparelho.'), { code: 'deadline-exceeded' });
  try {
    return await Promise.race([
      operation(() => { if (!active) throw timeoutError(); }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { active = false; reject(timeoutError()); }, 25000); }),
    ]);
  } finally { active = false; if (timer) clearTimeout(timer); }
}
export const cloudSync = createCloudSyncService(AsyncStorage, localData, remote, agendaReminders);
