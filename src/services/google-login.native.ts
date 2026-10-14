import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { GoogleAuthProvider, signInWithCredential, type Auth } from 'firebase/auth';
import { googleIosClientId, googleWebClientId } from './auth-config';
import { validGoogleClientId } from './auth-settings';
import { authFailure } from './auth-model';

let nativeGoogle: typeof import('@react-native-google-signin/google-signin') | null = null;
async function sdk() {
  // Never evaluate the native module in Expo Go, where that module is unavailable.
  if (!nativeGoogle) nativeGoogle = await import('@react-native-google-signin/google-signin');
  return nativeGoogle;
}
export async function googleLogin(auth: Auth): Promise<'success' | 'cancelled'> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) throw authFailure('auth/google-unavailable');
  if (!validGoogleClientId(googleWebClientId) || (Platform.OS === 'ios' && !validGoogleClientId(googleIosClientId))) throw authFailure('auth/google-not-configured');
  const module = await sdk();
  try {
    module.GoogleSignin.configure({ webClientId: googleWebClientId, iosClientId: googleIosClientId, offlineAccess: false });
    if (Platform.OS === 'android') await module.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await module.GoogleSignin.signIn();
    if (response.type === 'cancelled') return 'cancelled';
    if (!response.data.idToken) throw authFailure('auth/invalid-credential');
    await signInWithCredential(auth, GoogleAuthProvider.credential(response.data.idToken));
    return 'success';
  } catch (reason) {
    if (module.isErrorWithCode(reason)) {
      if (reason.code === module.statusCodes.SIGN_IN_CANCELLED) return 'cancelled';
      if (reason.code === module.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw authFailure('auth/google-services');
    }
    throw reason;
  }
}
export async function clearGoogleLogin(): Promise<void> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || !validGoogleClientId(googleWebClientId)) return;
  try { const module = await sdk(); await module.GoogleSignin.signOut(); } catch { /* Firebase sign-out remains authoritative. */ }
}
