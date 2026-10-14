export interface ReaderPreferences {
  size: 'standard' | 'medium' | 'large';
  spacing: 'standard' | 'wide';
  layout: 'cards' | 'continuous';
}
export const readerDefaults: Readonly<ReaderPreferences> = Object.freeze({ size: 'standard', spacing: 'standard', layout: 'cards' });
export const readerPreferencesKey = '@biblia-smart/reader-preferences/v1';
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
const allowed = { size: ['standard', 'medium', 'large'], spacing: ['standard', 'wide'], layout: ['cards', 'continuous'] };
function validate(value: unknown, partial = false): ReaderPreferences | Partial<ReaderPreferences> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Preferências inválidas.');
  const entries = Object.entries(value);
  if (!entries.length || (!partial && entries.length !== 3) || entries.some(([key, entry]) => !Object.hasOwn(allowed, key) || !(allowed[key as keyof ReaderPreferences] as readonly unknown[]).includes(entry))) throw Error('Preferências inválidas.');
  return { ...value } as ReaderPreferences;
}
export function readerTypography(value: ReaderPreferences) {
  const fontSize = value.size === 'large' ? 25 : value.size === 'medium' ? 22 : 19;
  return { fontSize, lineHeight: Math.round(fontSize * (value.spacing === 'wide' ? 1.95 : 1.65)) };
}
export function createReaderPreferencesRepository(storage: Storage) {
  let pending: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation); pending = result.catch(() => undefined); return result;
  }
  async function readStored(): Promise<ReaderPreferences> {
    const raw = await storage.getItem(readerPreferencesKey);
    if (raw === null) return { ...readerDefaults };
    const stored: unknown = JSON.parse(raw);
    if (!stored || typeof stored !== 'object' || !('version' in stored) || stored.version !== 1 || !('preferences' in stored)) throw Error('Preferências incompatíveis.');
    return validate(stored.preferences) as ReaderPreferences;
  }
  return {
    read: () => serial(readStored),
    update: (patch: Partial<ReaderPreferences>) => serial(async () => {
      const validated = validate(patch, true);
      const next = { ...await readStored(), ...validated };
      await storage.setItem(readerPreferencesKey, JSON.stringify({ version: 1, preferences: next }));
      return next;
    }),
  };
}
