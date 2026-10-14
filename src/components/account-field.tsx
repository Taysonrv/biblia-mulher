import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from './app-theme';
import { useUi } from './modern-ui';
export function AccountField({ label, value, onChange, kind, disabled = false, onSubmit }: {
  label: string; value: string; onChange(value: string): void; kind: 'name' | 'email' | 'password' | 'new-password'; disabled?: boolean; onSubmit?: () => void;
}) {
  const { palette: p } = useAppTheme(); const ui = useUi(); const [visible, setVisible] = useState(false);
  const password = kind === 'password' || kind === 'new-password';
  return <View style={{ gap: 8 }}><Text style={ui.cardTitle}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: p.border, backgroundColor: p.surfaceRaised }}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} autoCorrect={false}
        autoCapitalize={kind === 'name' ? 'words' : 'none'} keyboardType={kind === 'email' ? 'email-address' : 'default'}
        autoComplete={kind === 'password' ? 'current-password' : kind} secureTextEntry={password && !visible}
        maxLength={kind === 'name' ? 60 : kind === 'email' ? 254 : 128} returnKeyType={onSubmit ? 'go' : 'next'}
        onSubmitEditing={onSubmit} placeholder={kind === 'email' ? 'voce@exemplo.com' : kind === 'name' ? 'Como podemos chamar você?' : 'Sua senha'} placeholderTextColor={p.subtle}
        style={{ color: p.text, flex: 1, minWidth: 0, minHeight: 54, padding: 14, fontSize: 16 }} />
      {password && <Pressable accessibilityRole="button" accessibilityLabel={(visible ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()} disabled={disabled} onPress={() => setVisible(current => !current)} style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons accessible={false} name={visible ? 'eye-off-outline' : 'eye-outline'} color={p.muted} size={22} />
      </Pressable>}
    </View>
  </View>;
}
