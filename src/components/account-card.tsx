import { Text, View } from 'react-native';
import { FeatureLink, IconBadge, OrbitCard, useUi } from './modern-ui';
import { useAccount } from './account-provider';
import { ActionButton } from './ui-controls';
export function AccountCard() {
  const account = useAccount(); const ui = useUi();
  return <OrbitCard><IconBadge name="person-outline" />
    <Text style={ui.heading}>{account.user ? account.user.name || 'Sua conta' : 'Uma conta para sua jornada.'}</Text>
    <Text style={ui.body}>{account.user ? account.user.email : 'Entre com o Google ou crie sua conta usando o e-mail.'}</Text>
    <View style={ui.pill}><Text style={ui.pillText}>{account.user ? 'CONECTADO' : 'ACESSO OPCIONAL'}</Text></View>
    {!account.ready && <Text style={ui.body}>Conferindo seu acesso…</Text>}
    {!account.configured && <Text style={ui.body}>O acesso à conta aguarda ativação. Sua leitura continua disponível sem entrar.</Text>}
    {!!account.error && <><Text accessibilityRole="alert" style={ui.body}>{account.error}</Text><ActionButton secondary label="Conferir acesso novamente" disabled={!!account.busy} onPress={account.retry} /></>}
    <FeatureLink title={account.user ? 'Gerenciar minha conta' : 'Entrar ou criar conta'} description={account.user ? 'Confira seu acesso e endereço de e-mail.' : 'Google, e-mail e recuperação de senha.'} icon="log-in-outline" href="/account" />
    <Text style={ui.body}>Favoritos, anotações, planos e agenda continuam neste aparelho, inclusive ao sair ou trocar de conta. A sincronização entre aparelhos será disponibilizada em uma próxima etapa.</Text>
  </OrbitCard>;
}
