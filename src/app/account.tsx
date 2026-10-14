import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { useUi } from '@/components/modern-ui';
import { useAppTheme } from '@/components/app-theme';
import { ActionButton, FilterChips } from '@/components/ui-controls';
import { AccountField } from '@/components/account-field';
import { useAccount } from '@/components/account-provider';
import { accountService } from '@/services/account';

export default function AccountScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme(); const account = useAccount();
  const [mode, setMode] = useState<'Entrar' | 'Criar conta' | 'Recuperar senha'>('Entrar');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const disabled = !account.ready || !!account.busy;
  useFocusEffect(useCallback(() => () => { setPassword(''); setConfirmation(''); }, []));
  function changeMode(value: typeof mode) { if (disabled) return; setMode(value); setPassword(''); setConfirmation(''); account.clearFeedback(); }
  async function submit() {
    const success = await account.action(mode, () => mode === 'Entrar' ? accountService.login(email, password) : mode === 'Criar conta' ? accountService.register(name, email, password, confirmation) : accountService.reset(email));
    if (success) { setPassword(''); setConfirmation(''); }
  }
  return <MinisterialScreen title={account.user ? 'Minha conta' : 'Sua conta'} backTo="/profile" preferBackTo>
    {!account.configured && <View style={ui.card}><Text style={ui.cardTitle}>Conta em preparação</Text><Text style={ui.body}>O cadastro e o login aguardam ativação. Você pode continuar lendo e usando seus dados locais sem entrar.</Text></View>}
    {!account.ready && <Text style={ui.body}>Conferindo seu acesso…</Text>}
    {account.user ? <>
      <View style={ui.card}><Text style={ui.heading}>{account.user.name || 'Sua jornada, com você.'}</Text><Text selectable style={ui.body}>{account.user.email}</Text><Text style={[ui.eyebrow, { color: p.accent }]}>{account.user.verified ? 'E-MAIL CONFIRMADO' : 'E-MAIL A CONFIRMAR'}</Text></View>
      {!account.user.verified && account.user.providers.includes('password') && <View style={ui.card}><Text style={ui.cardTitle}>Confirme seu e-mail</Text><Text style={ui.body}>Abra a mensagem enviada ao seu endereço. Depois, confira a confirmação aqui.</Text>
        <ActionButton label="Reenviar confirmação" disabled={disabled} busy={account.busy === 'verify'} onPress={() => void account.action('verify', accountService.verify)} />
        <ActionButton secondary label="Já confirmei meu e-mail" disabled={disabled} busy={account.busy === 'reload'} onPress={() => void account.action('reload', accountService.reload)} />
      </View>}
      <View style={ui.card}><Text style={ui.cardTitle}>Sua jornada neste aparelho</Text><Text style={ui.body}>Seus favoritos, anotações, planos e agenda permanecem disponíveis ao sair ou trocar de conta. Para levar esses dados a outro celular, use o backup. A sincronização automática será disponibilizada em uma próxima etapa.</Text><ActionButton secondary label="Abrir meus dados" disabled={disabled} onPress={() => router.navigate('/my-data')} /></View>
      <ActionButton secondary label="Sair da conta" disabled={disabled} busy={account.busy === 'logout'} onPress={() => void account.action('logout', accountService.logout)} />
    </> : <>
      <Text style={ui.heading}>{mode === 'Recuperar senha' ? 'Vamos recuperar seu acesso.' : mode === 'Criar conta' ? 'Comece sua conta.' : 'Bem-vindo à sua jornada.'}</Text>
      {mode !== 'Recuperar senha' && <>
        <Pressable accessibilityRole="button" accessibilityLabel="Continuar com Google" accessibilityState={{ disabled, busy: account.busy === 'google' }} disabled={disabled}
          onPress={() => void account.action('google', accountService.google)} style={({ pressed }) => [ui.button, { backgroundColor: p.surfaceRaised, borderWidth: 1, borderColor: p.border, flexDirection: 'row', justifyContent: 'center', gap: 12 }, disabled && { opacity: 0.5 }, pressed && ui.pressed]}>
          <Ionicons accessible={false} name="logo-google" color={p.text} size={22} /><Text style={[ui.buttonText, { color: p.text }]}>{account.busy === 'google' ? 'Conectando…' : 'Continuar com Google'}</Text>
        </Pressable>
        <Text style={[ui.body, { textAlign: 'center' }]}>ou use seu e-mail</Text>
        <FilterChips label="Acesso por e-mail" values={['Entrar', 'Criar conta']} selected={mode} onSelect={value => changeMode(value as typeof mode)} />
      </>}
      <View style={ui.card}>
        {mode === 'Criar conta' && <AccountField label="Nome" value={name} onChange={setName} kind="name" disabled={disabled} />}
        <AccountField label="E-mail" value={email} onChange={setEmail} kind="email" disabled={disabled} onSubmit={mode === 'Recuperar senha' ? () => void submit() : undefined} />
        {mode !== 'Recuperar senha' && <AccountField label="Senha" value={password} onChange={setPassword} kind={mode === 'Criar conta' ? 'new-password' : 'password'} disabled={disabled} onSubmit={mode === 'Entrar' ? () => void submit() : undefined} />}
        {mode === 'Criar conta' && <><Text style={ui.body}>Use uma senha de 8 a 128 caracteres.</Text><AccountField label="Confirmar senha" value={confirmation} onChange={setConfirmation} kind="new-password" disabled={disabled} onSubmit={() => void submit()} /></>}
        {mode === 'Recuperar senha' && <Text style={ui.body}>Informe o e-mail usado na sua conta para receber as instruções de recuperação.</Text>}
        <ActionButton label={mode === 'Recuperar senha' ? 'Enviar instruções' : mode === 'Criar conta' ? 'Criar minha conta' : 'Entrar com e-mail'} disabled={disabled} busy={account.busy === mode} onPress={() => void submit()} />
        <ActionButton secondary label={mode === 'Recuperar senha' ? 'Voltar para entrar' : 'Esqueci minha senha'} disabled={disabled} onPress={() => changeMode(mode === 'Recuperar senha' ? 'Entrar' : 'Recuperar senha')} />
      </View>
      <Text style={ui.body}>O acesso à conta não é obrigatório. Sua jornada local continua disponível ao entrar, sair ou trocar de conta.</Text>
      <ActionButton secondary label="Continuar sem conta" disabled={disabled} onPress={() => { setPassword(''); setConfirmation(''); router.navigate('/profile'); }} />
    </>}
    {!!account.error && <Text accessibilityRole="alert" style={{ color: p.danger, lineHeight: 23 }}>{account.error}</Text>}
    {!!account.notice && <View style={ui.card}><Text accessibilityLiveRegion="polite" style={ui.body}>{account.notice}</Text></View>}
  </MinisterialScreen>;
}
