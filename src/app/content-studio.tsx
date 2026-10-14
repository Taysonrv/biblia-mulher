import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { useContentLibrary } from '@/components/content-provider';
import { withPremiumAccess } from '@/components/premium-access';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { ActionButton, FilterChips } from '@/components/ui-controls';
import { useAppTheme } from '@/components/app-theme';
import { useSubscription } from '@/components/subscription-provider';
import { pickContentFile, releaseContentFile } from '@/services/content-file';
import type { MediaKind } from '@/services/premium-content-model';
function ContentStudioScreen() {
  const ui = useUi(); const s = useMinisterialStyles(); const { palette: p } = useAppTheme(); const { mode, testAccess } = useSubscription(); const library = useContentLibrary();
  const [kind, setKind] = useState('Mentoria'); const [title, setTitle] = useState(''); const [presenter, setPresenter] = useState(''); const [description, setDescription] = useState('');
  const [lessons, setLessons] = useState<{ title: string; media: MediaKind; uri: string }[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const alive = useRef(false); const locked = useRef(false); const owned = useRef<string[]>([]); const registered = useRef(false);
  useEffect(() => { alive.current = true; const files = owned.current; return () => { alive.current = false; if (!registered.current) files.forEach(releaseContentFile); }; }, []);
  async function pick() {
    if (locked.current || lessons.length >= 8) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const file = await pickContentFile(); if (!file) return;
      if (!alive.current) { releaseContentFile(file.uri); return; }
      owned.current.push(file.uri); setLessons(previous => [...previous, { title: file.name.replace(/\.[^.]+$/, '').slice(0, 140), media: file.media, uri: file.uri }]);
    } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Não foi possível selecionar o arquivo.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  function save() {
    if (locked.current) return;
    try {
      const item = library.addPreview({ kind: kind === 'Mentoria' ? 'mentoria' : 'pregacao', title, presenter, description, lessons });
      registered.current = true; Keyboard.dismiss(); router.replace({ pathname: '/premium-content', params: { id: item.id } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Confira os campos para continuar.'); }
  }
  if ((!__DEV__ && !testAccess) || mode !== 'preview') return <MinisterialScreen title="Página indisponível" backTo="/premium-library" preferBackTo><FeatureLink title="Biblioteca Premium" description="Encontre mentorias e pregações." icon="library-outline" href="/premium-library" /></MinisterialScreen>;
  return <MinisterialScreen title="Estúdio de testes" backTo="/premium-library" preferBackTo>
    <View style={ui.card}><Text style={ui.eyebrow}>PRÉVIA LOCAL • SEM PUBLICAÇÃO</Text><Text style={ui.heading}>Teste seu conteúdo no app.</Text><Text style={ui.body}>Escolha vídeos ou áudios deste aparelho e confira as aulas e a reprodução. Os arquivos não são enviados nem disponibilizados para outros usuários. As prévias terminam ao reiniciar o app, trocar de conta ou encerrar uma simulação manual.</Text></View>
    <FilterChips label="Tipo de conteúdo" values={['Mentoria', 'Pregação']} selected={kind} onSelect={setKind} />
    {[{ label: 'Título do conteúdo', value: title, set: setTitle, max: 140 }, { label: 'Responsável / mentor / pregador', value: presenter, set: setPresenter, max: 100 }, { label: 'Descrição do conteúdo', value: description, set: setDescription, max: 2000 }].map(field => <View key={field.label} style={{ gap: 8 }}><Text style={ui.cardTitle}>{field.label}</Text><TextInput accessibilityLabel={field.label} editable={!busy} value={field.value} onChangeText={field.set} maxLength={field.max} multiline placeholder={field.label} placeholderTextColor={p.subtle} style={[s.input, { minHeight: field.max === 2000 ? 100 : 56 }]} /></View>)}
    <Text style={ui.heading}>Aulas ou partes da mensagem</Text>
    <Text style={ui.body}>Até 8 partes neste teste. Prefira vídeo MP4 com H.264/AAC ou áudio MP3/M4A. Cada vídeo pode ter até 250 MB e cada áudio, 50 MB.</Text>
    {lessons.map((item, index) => <View key={item.uri} style={ui.card}><Text style={ui.eyebrow}>{index + 1}. {item.media === 'video' ? 'VÍDEO' : 'ÁUDIO'}</Text><TextInput accessibilityLabel={`Título da parte ${index + 1}`} value={item.title} editable={!busy} maxLength={140} multiline onChangeText={value => setLessons(previous => previous.map((part, position) => position === index ? { ...part, title: value } : part))} style={[s.input, { minHeight: 56 }]} /></View>)}
    <ActionButton secondary label="Escolher vídeo ou áudio" disabled={busy || lessons.length >= 8} busy={busy} onPress={() => void pick()} />
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <ActionButton label="Abrir prévia no app" disabled={busy || !title.trim() || !presenter.trim() || !description.trim() || !lessons.length || lessons.some(item => !item.title.trim())} onPress={save} />
  </MinisterialScreen>;
}
export default withPremiumAccess(ContentStudioScreen, 'media', '/premium-library');
