import { getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseSettings } from './auth-config';
let session: Auth | null = null;
export function getFirebaseSession(): Auth | null {
  if (!firebaseSettings) return null;
  if (!session) {
    const app = getApps().find(item => item.name === 'biblia-smart') ?? initializeApp(firebaseSettings, 'biblia-smart');
    session = getAuth(app); session.languageCode = 'pt';
  }
  return session;
}
