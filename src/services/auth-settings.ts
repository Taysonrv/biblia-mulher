import type { FirebaseOptions } from 'firebase/app';
export function readFirebaseSettings(values: { apiKey?: string; authDomain?: string; projectId?: string; appId?: string }): FirebaseOptions | null {
  const entries = Object.entries(values);
  if (entries.length !== 4 || entries.some(([, value]) => typeof value !== 'string' || !value.trim() || /(?:preencher|your[_-]|api-key|project-id|app-id)/i.test(value))) return null;
  if (!/^[a-zA-Z0-9.-]+$/.test(values.authDomain!) || !values.authDomain!.includes('.')) return null;
  return Object.fromEntries(entries.map(([key, value]) => [key, value!.trim()]));
}
export function validGoogleClientId(value?: string) { return typeof value === 'string' && /^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(value.trim()); }
