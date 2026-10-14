import { withPremiumAccess } from '@/components/premium-access';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/components/app-theme';
import { ActionButton } from '@/components/ui-controls';
import { useSavedSermons } from '@/hooks/use-saved-sermons';
import type { SavedSermon } from '@/services/sermon-repository';
import { movePresentation, PRESENTATION_FONT_SIZES, presentationPosition, presentationSections } from '@/services/sermon-presentation';

function leave(id: string) {
  router.navigate(id ? { pathname: '/sermon-outline', params: { id } } : '/sermons');
}

function Presentation({ message }: { message: SavedSermon }) {
  const { palette: p } = useAppTheme();
  const [sectionId, setSectionId] = useState('base');
  const [fontIndex, setFontIndex] = useState(1);
  const [choosing, setChoosing] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const sections = presentationSections(message, includeNotes);
  const position = presentationPosition(sections, sectionId);
  const current = sections[position];
  const fontSize = PRESENTATION_FONT_SIZES[fontIndex];
  function toggleNotes() {
    if (includeNotes && sectionId === 'notes') setSectionId('questions');
    setIncludeNotes(value => !value);
  }

  return <>
    <View style={[styles.toolbar, { borderBottomColor: p.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={choosing ? 'Voltar à mensagem' : 'Escolher seção'}
        accessibilityState={{ expanded: choosing }} onPress={() => setChoosing(value => !value)}
        style={({ pressed }) => [styles.sectionButton, { backgroundColor: p.surfaceRaised, opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons accessible={false} name={choosing ? 'book-outline' : 'list-outline'} size={20} color={p.accent} />
        <Text style={[styles.controlText, { color: p.accent }]}>{choosing ? 'Voltar' : 'Seções'}</Text>
      </Pressable>
      <View style={styles.fontControls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Diminuir texto" accessibilityState={{ disabled: fontIndex === 0 }} disabled={fontIndex === 0}
          onPress={() => setFontIndex(value => Math.max(0, value - 1))}
          style={({ pressed }) => [styles.iconButton, { opacity: fontIndex === 0 ? 0.35 : pressed ? 0.7 : 1 }]}>
          <Text accessible={false} style={[styles.controlText, { color: p.text }]}>A−</Text>
        </Pressable>
        <Text accessibilityLabel={`Tamanho do texto: ${fontSize}`} accessibilityLiveRegion="polite" style={[styles.sizeText, { color: p.muted }]}>{fontSize}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Aumentar texto" accessibilityState={{ disabled: fontIndex === PRESENTATION_FONT_SIZES.length - 1 }} disabled={fontIndex === PRESENTATION_FONT_SIZES.length - 1}
          onPress={() => setFontIndex(value => Math.min(PRESENTATION_FONT_SIZES.length - 1, value + 1))}
          style={({ pressed }) => [styles.iconButton, { opacity: fontIndex === PRESENTATION_FONT_SIZES.length - 1 ? 0.35 : pressed ? 0.7 : 1 }]}>
          <Text accessible={false} style={[styles.controlText, { color: p.text }]}>A+</Text>
        </Pressable>
      </View>
    </View>
    <ScrollView key={choosing ? 'picker' : current.id} style={styles.scroll} contentContainerStyle={styles.content}>
      {choosing ? <>
        <Text accessibilityRole="header" style={[styles.pickerTitle, { color: p.text }]}>Escolha uma seção</Text>
        <Text style={[styles.hint, { color: p.muted }]}>Vá direto ao ponto que precisa retomar.</Text>
        {!!message.notes.trim() && <Pressable accessibilityRole="checkbox" accessibilityLabel="Mostrar minhas notas pessoais"
          accessibilityState={{ checked: includeNotes }} aria-checked={includeNotes} onPress={toggleNotes}
          style={({ pressed }) => [styles.pickerRow, { borderColor: p.border, backgroundColor: p.surface, opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons accessible={false} name={includeNotes ? 'checkbox' : 'square-outline'} size={23} color={p.accent} />
          <Text style={[styles.rowText, { color: p.text }]}>Mostrar minhas notas pessoais</Text>
        </Pressable>}
        <View accessibilityRole="radiogroup" accessibilityLabel="Seções da mensagem" style={styles.sectionList}>
          {sections.map((section, index) => <Pressable key={section.id} accessibilityRole="radio" accessibilityLabel={`${index + 1}. ${section.title}`}
            accessibilityState={{ checked: section.id === current.id }} aria-checked={section.id === current.id}
            onPress={() => { setSectionId(section.id); setChoosing(false); }}
            style={({ pressed }) => [styles.pickerRow, { borderColor: section.id === current.id ? p.accent : p.border,
              backgroundColor: section.id === current.id ? p.accentSurface : p.surface, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.number, { color: p.accent }]}>{index + 1}</Text>
            <Text style={[styles.rowText, { color: p.text }]}>{section.title}</Text>
            {section.id === current.id && <Ionicons accessible={false} name="checkmark" size={20} color={p.accent} />}
          </Pressable>)}
        </View>
      </> : <>
        <Text style={[styles.eyebrow, { color: p.accent }]}>SEÇÃO {position + 1} DE {sections.length}</Text>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: p.text, fontSize: fontSize + 2, lineHeight: (fontSize + 2) * 1.35 }]}>{current.title}</Text>
        <Text selectable style={{ color: p.text, fontSize, lineHeight: fontSize * 1.65 }}>{current.body}</Text>
        {current.id === 'base' && <Text style={[styles.hint, { color: p.muted }]}>Confira a passagem na sua Bíblia. Use Seções para escolher um ponto ou exibir suas notas.</Text>}
      </>}
    </ScrollView>
    <View style={[styles.footer, { borderTopColor: p.border }]}>
      <Text accessibilityLiveRegion="polite" style={[styles.progress, { color: p.muted }]}>{position + 1} / {sections.length} · {choosing ? 'Escolhendo seção' : current.title}</Text>
      <View style={styles.navigation}>
        <View style={styles.previous}><ActionButton secondary label="Anterior" disabled={position === 0 || choosing}
          onPress={() => setSectionId(movePresentation(sections, current.id, -1))} /></View>
        <View style={styles.next}><ActionButton label={position === sections.length - 1 ? 'Concluir' : 'Próxima'} disabled={choosing}
          onPress={() => position === sections.length - 1 ? leave(message.id) : setSectionId(movePresentation(sections, current.id, 1))} /></View>
      </View>
    </View>
  </>;
}

function SermonPresenterScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? '';
  const { palette: p } = useAppTheme();
  const library = useSavedSermons();
  const message = library.ready ? library.entries.find(entry => entry.id === id) : undefined;
  const error = library.error || (library.ready && !message ? 'Esta mensagem não foi encontrada. Volte aos seus esboços.' : '');
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }} edges={['top', 'bottom', 'left', 'right']}>
    <View style={styles.frame}>
      <View style={styles.header}>
        <View style={styles.headerText}><Text style={[styles.eyebrow, { color: p.accent }]}>MODO APRESENTAÇÃO</Text>
          <Text numberOfLines={2} style={[styles.theme, { color: p.text }]}>{message?.outline.theme ?? 'Minha mensagem'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sair da apresentação" onPress={() => leave(message ? id : '')}
          style={({ pressed }) => [styles.iconButton, { backgroundColor: p.surfaceRaised, borderRadius: 14, opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons accessible={false} name="close-outline" size={25} color={p.text} />
        </Pressable>
      </View>
      {message ? <Presentation key={`${message.id}:${message.updatedAt}`} message={message} />
        : <ScrollView contentContainerStyle={styles.content}>
          {error ? <><Text accessibilityRole="alert" style={[styles.hint, { color: p.danger }]}>{error}</Text>
            {!!library.error && <ActionButton label="Tentar abrir mensagem" onPress={library.retry} />}
            <ActionButton secondary label="Voltar aos meus esboços" onPress={() => leave('')} /></>
            : <ActivityIndicator accessibilityLabel="Abrindo mensagem" color={p.accent} size="large" />}
        </ScrollView>}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: { fontSize: 11, lineHeight: 17, letterSpacing: 1.2, fontWeight: '700' },
  theme: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  iconButton: { minWidth: 44, minHeight: 44, padding: 8, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, gap: 8, borderBottomWidth: 1 },
  sectionButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlText: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  fontControls: { flexDirection: 'row', alignItems: 'center' },
  sizeText: { fontSize: 13, lineHeight: 20, minWidth: 26, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 36, gap: 18 },
  sectionTitle: { fontWeight: '700' },
  pickerTitle: { fontSize: 23, lineHeight: 31, fontWeight: '700' },
  hint: { fontSize: 15, lineHeight: 24 },
  sectionList: { gap: 10 },
  pickerRow: { borderWidth: 1, borderRadius: 16, minHeight: 54, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { fontSize: 15, lineHeight: 23, fontWeight: '700', minWidth: 18 },
  rowText: { fontSize: 16, lineHeight: 24, flex: 1, minWidth: 0 },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 10 },
  progress: { fontSize: 12, lineHeight: 18 },
  navigation: { flexDirection: 'row', gap: 10 },
  previous: { flex: 1 },
  next: { flex: 1.25 },
});

export default withPremiumAccess(SermonPresenterScreen, 'ministerial', '/sermons');
