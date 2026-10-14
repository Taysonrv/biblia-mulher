import { useCallback, useRef, useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { useAppTheme } from '@/components/app-theme';
import { useSubscription } from '@/components/subscription-provider';
import { personalStudies } from '@/services/personal-studies';
import { personalStudyInfo, STUDY_NOTE_LIMIT, validStudyTarget, type PersonalStudy, type StudyKind } from '@/services/personal-studies-repository';

function StudyNoteEditor({ kind, studyId, backTo }: { kind: StudyKind; studyId: string; backTo: Href }) {
  const ui = useUi(); const s = useMinisterialStyles(); const { palette: p } = useAppTheme(); const info = personalStudyInfo({ kind, studyId });
  const [entry, setEntry] = useState<PersonalStudy | null>(null); const [draft, setDraft] = useState(''); const [ready, setReady] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [confirmClear, setConfirmClear] = useState(false); const [confirmReload, setConfirmReload] = useState(false);
  const focused = useRef(false); const dirty = useRef(false); const locked = useRef(false); const request = useRef(0);
  const load = useCallback((replaceDraft = false) => {
    const id = ++request.current; setError('');
    if (replaceDraft) setReady(false);
    personalStudies.read().then(rows => {
      if (!focused.current || request.current !== id) return;
      const stored = rows.find(row => row.kind === kind && row.studyId === studyId) ?? null;
      if (!dirty.current || replaceDraft) { setEntry(stored); setDraft(stored?.note ?? ''); dirty.current = false; }
      setReady(true);
    }).catch(() => { if (focused.current && request.current === id) setError('Não foi possível carregar sua reflexão. O texto foi preservado. Tente novamente.'); });
  }, [kind, studyId]);
  useFocusEffect(useCallback(() => { focused.current = true; load(); return () => { focused.current = false; request.current++; }; }, [load]));
  async function save(confirmed = false) {
    if (!ready || locked.current) return;
    if (entry?.note && !draft.trim() && !confirmed) { setConfirmClear(true); return; }
    locked.current = true; setBusy(true); setError('');
    try {
      const saved = await personalStudies.saveNote(kind, studyId, draft, entry?.updatedAt ?? null);
      dirty.current = false; setEntry(saved ?? null); setDraft(saved?.note ?? ''); setConfirmClear(false); Keyboard.dismiss();
      if (focused.current) router.navigate(backTo);
    } catch (reason) { if (focused.current) setError(reason instanceof Error ? reason.message : 'Não foi possível salvar sua reflexão. Tente novamente.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <MinisterialScreen title="Minha reflexão" backTo={backTo} preferBackTo>
    <View style={ui.card}><Text style={ui.eyebrow}>{kind === 'book' ? 'ESTUDO DO LIVRO' : 'PALAVRA NO ORIGINAL'}</Text><Text style={ui.heading}>{info.title}</Text><Text style={ui.body}>{info.subtitle}</Text></View>
    <Text style={ui.heading}>O que você aprendeu?</Text><Text style={ui.body}>Registre suas descobertas, dúvidas e como este estudo se conecta à sua vida. A reflexão aparece em Meus estudos mesmo sem salvar o estudo.</Text>
    <TextInput accessibilityLabel="Minha reflexão sobre o estudo" editable={ready && !busy} multiline maxLength={STUDY_NOTE_LIMIT} value={draft}
      onChangeText={value => { setDraft(value); dirty.current = value !== (entry?.note ?? ''); setConfirmClear(false); setConfirmReload(false); }}
      placeholder="Escreva sua reflexão…" placeholderTextColor={p.subtle} style={s.input} underlineColorAndroid="transparent" />
    <Text style={ui.body}>{draft.length}/2.000 caracteres. Use Salvar reflexão para guardar seu texto neste aparelho.</Text>
    <ActionButton label="Salvar reflexão" busy={busy} disabled={!ready || busy} onPress={() => void save()} />
    {!!error && <><Text accessibilityRole="alert" style={s.error}>{error}</Text><ActionButton secondary label={ready ? 'Recarregar reflexão salva' : 'Tentar carregar reflexão'} disabled={busy}
      onPress={() => dirty.current ? setConfirmReload(true) : load(true)} /></>}
    {confirmClear && <View style={ui.card}><Text style={ui.heading}>Apagar a reflexão salva?</Text><Text style={ui.body}>O campo está vazio. Salvar assim apagará a reflexão deste estudo. {entry?.saved ? 'O estudo continuará marcado como salvo.' : 'Como o estudo não está marcado como salvo, também deixará sua coleção.'}</Text><ActionButton label="Confirmar apagar reflexão" disabled={busy} onPress={() => void save(true)} /><ActionButton secondary label="Continuar escrevendo" disabled={busy} onPress={() => setConfirmClear(false)} /></View>}
    {confirmReload && <View style={ui.card}><Text style={ui.heading}>Recarregar a versão salva?</Text><Text style={ui.body}>Seu rascunho será substituído pelo texto salvo. Copie o que quiser preservar antes de continuar.</Text><Text selectable style={ui.body}>{draft}</Text><ActionButton label="Confirmar recarregar reflexão" disabled={busy} onPress={() => { setConfirmReload(false); load(true); }} /><ActionButton secondary label="Manter meu rascunho" onPress={() => setConfirmReload(false)} /></View>}
  </MinisterialScreen>;
}
export default function StudyNoteScreen() {
  const { hasPremium } = useSubscription();
  const { kind, studyId, fromStudySearch, fromMyStudies } = useLocalSearchParams<{ kind?: string; studyId?: string; fromStudySearch?: string; fromMyStudies?: string }>(); const ui = useUi();
  if (!validStudyTarget(kind, studyId) || !studyId) return <MinisterialScreen title="Minha reflexão" backTo="/studies" preferBackTo><Text style={ui.heading}>Estudo não encontrado.</Text><FeatureLink title="Explorar estudos" description="Escolha um livro ou palavra no catálogo." icon="library-outline" href="/studies" /></MinisterialScreen>;
  const flags = { ...(fromStudySearch === '1' ? { fromStudySearch: '1' } : {}), ...(fromMyStudies === '1' ? { fromMyStudies: '1' } : {}) };
  const backTo: Href = !hasPremium ? '/my-studies' : kind === 'book' ? { pathname: '/book-study', params: { book: studyId, ...flags } } : { pathname: '/word-study', params: { word: studyId, ...flags } };
  return <StudyNoteEditor key={kind + ':' + studyId} kind={kind} studyId={studyId} backTo={backTo} />;
}
