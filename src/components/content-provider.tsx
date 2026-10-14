import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { useSubscription } from './subscription-provider';
import { createContentLibrary } from '@/services/premium-content-model';
import { contentAdapter } from '@/services/premium-content';
import { releaseContentFile } from '@/services/content-file';
type ContentLibrary = ReturnType<typeof createContentLibrary>;
const ContentContext = createContext<ContentLibrary | null>(null);
export function ContentProvider({ children }: PropsWithChildren) {
  const { mode, accountId, current, testAccess } = useSubscription();
  const library = useMemo(() => createContentLibrary(contentAdapter, __DEV__ || testAccess, current), [current, testAccess]);
  useEffect(() => { library.reset().forEach(releaseContentFile); return () => library.reset().forEach(releaseContentFile); }, [library, mode, accountId]);
  return <ContentContext value={library}>{children}</ContentContext>;
}
export function useContentLibrary() { const value = useContext(ContentContext); if (!value) throw new Error('ContentProvider is required.'); return value; }
