import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { darkPalette, lightPalette, darkGradients, lightGradients } from '@/constants/design';
import * as SystemUI from 'expo-system-ui';
type Mode = 'light' | 'dark';
const KEY = '@biblia-mulher/theme/v1';
const ThemeContext = createContext({ mode: 'dark' as Mode, ready: false, busy: false, error: '', setMode: async (_mode: Mode) => false });
export function AppThemeProvider({ children }: PropsWithChildren) {
  const [mode, applyMode] = useState<Mode>('dark');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(saved => { if (active && (saved === 'light' || saved === 'dark')) applyMode(saved); })
      .catch(() => { if (active) setError('Não foi possível recuperar sua preferência de tema.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => { void SystemUI.setBackgroundColorAsync(mode === 'dark' ? darkPalette.background : lightPalette.background).catch(() => undefined); }, [mode]);
  async function setMode(next: Mode) {
    if (!ready || locked.current) return false;
    locked.current = true; setBusy(true);
    try { await AsyncStorage.setItem(KEY, next); applyMode(next); setError(''); return true; }
    catch { setError('Não foi possível salvar o tema. Tente novamente.'); return false; }
    finally { locked.current = false; setBusy(false); }
  }
  return <ThemeContext.Provider value={{ mode, ready, busy, error, setMode }}>{children}</ThemeContext.Provider>;
}
export function useAppTheme() {
  const theme = useContext(ThemeContext);
  return { ...theme, palette: theme.mode === 'dark' ? darkPalette : lightPalette, gradients: theme.mode === 'dark' ? darkGradients : lightGradients };
}
