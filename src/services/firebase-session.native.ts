import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { firebaseSettings } from './auth-config';
let session: Auth | null = null;
// The SDK's React Native entry exports this documented function; its shared web types omit it.
const getReactNativePersistence = (FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence(storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>): Persistence;
}).getReactNativePersistence;
export function getFirebaseSession(): Auth | null {
  if (!firebaseSettings) return null;
  if (!session) {
    const app = getApps().find(item => item.name === 'biblia-smart') ?? initializeApp(firebaseSettings, 'biblia-smart');
    try { session = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
    catch (reason) {
      if (!reason || typeof reason !== 'object' || !('code' in reason) || reason.code !== 'auth/already-initialized') throw reason;
      session = getAuth(app);
    }
    session.languageCode = 'pt';
  }
  return session;
}
