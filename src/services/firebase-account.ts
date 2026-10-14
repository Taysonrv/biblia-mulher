import { createUserWithEmailAndPassword, onAuthStateChanged, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile, type User } from 'firebase/auth';
import { firebaseSettings } from './auth-config';
import { getFirebaseSession } from './firebase-session';
import { clearGoogleLogin, googleLogin } from './google-login';
import { authFailure, type AccountUser, type AuthAdapter } from './auth-model';
function account(user: User | null): AccountUser | null {
  return user ? { uid: user.uid, email: user.email, name: user.displayName, verified: user.emailVerified, providers: user.providerData.map(provider => provider.providerId) } : null;
}
function session() { const auth = getFirebaseSession(); if (!auth) throw authFailure('auth/not-configured'); return auth; }
function user() { const current = session().currentUser; if (!current) throw authFailure('auth/no-user'); return current; }
export const firebaseAccount: AuthAdapter = {
  configured: !!firebaseSettings,
  current: () => account(getFirebaseSession()?.currentUser ?? null),
  subscribe(listener, error) {
    try {
      const auth = getFirebaseSession(); if (!auth) { listener(null); return () => undefined; }
      return onAuthStateChanged(auth, current => listener(account(current)), error);
    } catch { error(); return () => undefined; }
  },
  async login(email, password) { await signInWithEmailAndPassword(session(), email, password); },
  async register(name, email, password) {
    const result = await createUserWithEmailAndPassword(session(), email, password);
    const messages = ['Sua conta foi criada.'];
    try { await updateProfile(result.user, { displayName: name }); }
    catch { messages.push('Não foi possível salvar seu nome agora. Seu acesso já está disponível.'); }
    try { await sendEmailVerification(result.user); messages.push('Confira seu e-mail para confirmar o endereço.'); }
    catch { messages.push('A mensagem de confirmação não foi enviada. Use a opção de reenviar nesta tela.'); }
    return messages.join(' ');
  },
  async reset(email) { await sendPasswordResetEmail(session(), email); },
  google: () => googleLogin(session()),
  async logout() { await signOut(session()); await clearGoogleLogin(); },
  async verify() { const current = user(); if (!current.emailVerified) await sendEmailVerification(current); },
  async reload() { await reload(user()); },
};
