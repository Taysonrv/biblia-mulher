import { useAppTheme } from '@/components/app-theme';
import type { Palette } from '@/constants/design';
import type { PropsWithChildren, RefObject } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';

export function MinisterialScreen({ title, backTo, children, scrollRef, onContentSizeChange, preferBackTo = false }: PropsWithChildren<{ title: string; backTo: Href; scrollRef?: RefObject<ScrollView | null>; onContentSizeChange?: (width: number, height: number) => void; preferBackTo?: boolean }>) {
  const ministerialStyles = useMinisterialStyles();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ministerialStyles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} onContentSizeChange={onContentSizeChange} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={ministerialStyles.container}>
          <View style={ministerialStyles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" style={({ pressed }) => [ministerialStyles.back, pressed && { opacity: 0.65 }]}
              onPress={() => preferBackTo ? router.navigate(backTo) : router.canGoBack() ? router.back() : router.replace(backTo)}>
              <Text style={ministerialStyles.backText}>‹</Text>
            </Pressable>
            <Text accessibilityRole="header" style={ministerialStyles.title}>{title}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function createStyles(p: Palette) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: p.background },
  container: { padding: 16, paddingBottom: 24, gap: 14, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { minWidth: 44, minHeight: 44, borderRadius: 16, borderWidth: 1, borderColor: p.border, backgroundColor: p.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, color: p.accent },
  title: { flex: 1, fontSize: 21, lineHeight: 28, fontWeight: '700', color: p.text },
  heading: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: p.text },
  body: { fontSize: 14, lineHeight: 21, color: p.muted },
  card: { padding: 14, gap: 10, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
  button: { minHeight: 44, padding: 12, borderRadius: 13, backgroundColor: p.accent, alignItems: 'center' },
  buttonText: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: p.ink },
  badge: { color: p.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  input: { minHeight: 140, padding: 16, borderWidth: 1, borderColor: p.accent, borderRadius: 16, backgroundColor: p.surface, color: p.text, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
  error: { color: p.danger, fontSize: 14, lineHeight: 21 },
}); }

export function useMinisterialStyles() { const { palette } = useAppTheme(); return createStyles(palette); }
