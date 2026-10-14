import { GoogleAuthProvider, signInWithPopup, type Auth } from 'firebase/auth';
export async function googleLogin(auth: Auth): Promise<'success' | 'cancelled'> {
  const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, provider); return 'success'; }
  catch (reason) {
    if (reason && typeof reason === 'object' && 'code' in reason && ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(String(reason.code))) return 'cancelled';
    throw reason;
  }
}
export async function clearGoogleLogin(): Promise<void> {}
