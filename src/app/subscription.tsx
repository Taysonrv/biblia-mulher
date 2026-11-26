import { BillingControls } from '@/components/billing-controls';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, IconBadge, OrbitCard, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { useSubscription } from '@/components/subscription-provider';
import { FREE_BENEFITS, PREMIUM_FEATURES } from '@/services/subscription-access';

export default function SubscriptionScreen() {
  const state = useSubscription(); const ui = useUi();
  return <MinisterialScreen title="Gratuito, Premium e Premium+" backTo="/profile">
    <Text style={ui.eyebrow}>{state.testAccess ? 'PREMIUM LIBERADO PARA TESTES • SEM COBRANÇA' : state.mode === 'preview' ? 'SIMULAÇÃO • SEM COBRANÇA' : state.mode === 'premium-plus' ? 'PREMIUM+ ATIVO' : state.mode === 'premium' ? 'PREMIUM ATIVO' : 'SEU MODO ATUAL • GRATUITO'}</Text>
    <Text style={ui.heading}>Um plano para cada momento.</Text>
    <Text style={ui.body}>A Palavra acompanha sua jornada. A assinatura amplia seus estudos e sua preparação ministerial.</Text>
    <View style={ui.card}>
      <IconBadge name="book-outline" /><Text accessibilityRole="header" style={ui.heading}>Gratuito</Text>
      <Text style={ui.cardTitle}>Sem assinatura e sem conta obrigatória</Text>
      {FREE_BENEFITS.map(item => <Text key={item} style={ui.body}>✓ {item}</Text>)}
      <ActionButton secondary label={state.hasPremium ? 'Continuar lendo a Bíblia' : 'Continuar no gratuito'} onPress={() => { state.setPreview(false); router.navigate('/bible'); }} />
    </View>
    <OrbitCard violet>
      <IconBadge name="sparkles-outline" violet /><Text accessibilityRole="header" style={ui.heading}>Bíblia VP Premium</Text>
      <Text style={ui.cardTitle}>Tudo do gratuito, mais:</Text>
      {Object.values(PREMIUM_FEATURES).map(item => <View key={item.title} style={{ gap: 4 }}><Text style={ui.cardTitle}>✓ {item.title}</Text><Text style={ui.body}>{item.description}</Text></View>)}
      <Text style={ui.body}>Desenvolva seu esboço em um roteiro mais detalhado, sem consumo de IA. A duração depende do texto e do seu ritmo; este plano não promete uma mensagem completa de 40 minutos.</Text>
      {!state.configured && <><Text style={ui.cardTitle}>Assinaturas em preparação</Text><Text style={ui.body}>A contratação ainda não está disponível. Preços e condições serão apresentados quando a assinatura for ativada. Nenhuma cobrança é realizada nesta versão.</Text></>}
      {state.hasPremium && state.expiresAt && <Text style={ui.body}>Acesso válido até {new Date(state.expiresAt).toLocaleString('pt-BR')}.</Text>}
    </OrbitCard>
    <OrbitCard>
      <IconBadge name="sparkles-outline" /><Text accessibilityRole="header" style={ui.heading}>Bíblia VP Premium+</Text>
      <Text style={ui.cardTitle}>Tudo do Premium, mais:</Text>
      <Text style={ui.body}>✓ Desenvolvimento completo por IA a partir do seu esboço.</Text>
      <Text style={ui.body}>✓ Escolha de 15, 25 ou 40 minutos, com prévia editável e estimativa de leitura.</Text>
      <Text style={ui.body}>Gerações com franquia de uso. Preço, quantidade mensal e condições ainda serão definidos após testes de custo. Não há oferta de IA ilimitada.</Text>
      <Text style={ui.body}>A geração exige conta, autorização para enviar o esboço e serviço de IA ativo. A contratação e a geração paga ainda não estão disponíveis nesta versão.</Text>
    </OrbitCard>
    <BillingControls />
    {!!state.error && <View style={ui.card}><Text accessibilityRole="alert" style={ui.body}>{state.error}</Text><ActionButton secondary label="Verificar acesso novamente" onPress={state.refresh} /></View>}
    <View style={ui.card}><Text style={ui.heading}>Seus registros continuam seus.</Text><Text style={ui.body}>Sem assinatura, você mantém acesso às reflexões e aos esboços que salvou. Pode editar e compartilhar seus textos e guardar um backup. O esboço básico e a leitura em tela cheia permanecem gratuitos. Novos roteiros desenvolvidos exigem Premium; novas gerações longas por IA exigem Premium+ e cota disponível.</Text></View>
    {state.testAccess && <View style={ui.card}>
      <Text style={ui.eyebrow}>ACESSO TEMPORÁRIO DE TESTE</Text>
      <Text style={ui.heading}>Todos os recursos Premium liberados.</Text>
      <Text style={ui.body}>Você pode explorar os estudos, preparar mensagens e acessar Mentorias e Pregações. A liberação continua ao reiniciar esta versão, sem conta obrigatória ou cobrança. As prévias de vídeos e áudios do estúdio ficam disponíveis apenas nesta sessão. A simulação não autoriza chamadas pagas de IA no servidor.</Text>
      <FeatureLink title="Explorar estudos Premium" description="Livros da Bíblia e palavras no original." icon="library-outline" href="/studies" />
      <FeatureLink title="Preparar uma mensagem" description="Crie seu esboço de apoio." icon="document-text-outline" href="/sermon-builder" />
      <FeatureLink title="Mentorias e Pregações" description="Acesse a biblioteca e o estúdio de testes." icon="play-circle-outline" href="/premium-library" />
    </View>}
    {__DEV__ && !state.testAccess && <View style={ui.card}>
      <Text style={ui.eyebrow}>SOMENTE NESTA VERSÃO DE TESTE</Text>
      <Text style={ui.heading}>{state.mode === 'preview' ? 'Simulação Premium ativa' : 'Teste a experiência Premium'}</Text>
      <Text style={ui.body}>Libere os recursos para validação no Expo Go. Esta simulação não é uma assinatura, não realiza compra e não fica salva ao reiniciar o app.</Text>
      <ActionButton label={state.mode === 'preview' ? 'Encerrar simulação Premium' : 'Simular Premium para testar'} onPress={() => state.setPreview(state.mode !== 'preview')} />
      {state.hasPremium && <FeatureLink title="Explorar recursos Premium" description="Valide os estudos e a preparação ministerial." icon="library-outline" href="/studies" />}
    </View>}
    <FeatureLink title="Minha conta" description="Cadastro e login são independentes da assinatura." icon="person-outline" href="/account" />
  </MinisterialScreen>;
}
