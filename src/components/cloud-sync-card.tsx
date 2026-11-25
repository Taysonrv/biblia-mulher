import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAccount } from './account-provider';
import { IconBadge, useUi } from './modern-ui';
import { useAppTheme } from './app-theme';
import { ActionButton } from './ui-controls';
import { cloudSync } from '@/services/cloud-sync';
import { syncErrorMessage, type SyncPreview } from '@/services/cloud-sync-service';
import type { SyncChoices } from '@/services/cloud-sync-model';
import type { backupCounts } from '@/services/backup-repository';

type Counts = ReturnType<typeof backupCounts>;
function countsText(counts: Counts) {
  return `${counts.favorites} favoritos · ${counts.notes} anotações · ${counts.plans} planos · ${counts.readings} leituras · ${counts.events} compromissos · ${counts.sermons} esboços · ${counts.studies} estudos · ${counts.studyNotes} reflexões`;
}
function ChangeCount({ title, count }: { title: string; count: number }) {
  const ui = useUi(); const { palette: p } = useAppTheme();
  return <View style={{ flexGrow: 1, flexBasis: 110, padding: 14, gap: 4, borderRadius: 14, backgroundColor: p.surfaceRaised }}>
    <Text style={ui.heading}>{count}</Text><Text style={ui.body}>{title}</Text>
  </View>;
}
export function CloudSyncCard({ onSynced }: { onSynced(counts: Counts): void }) {
  const account = useAccount();
  return <CloudSyncSession key={account.user?.uid ?? 'guest'} onSynced={onSynced} />;
}
function CloudSyncSession({ onSynced }: { onSynced(counts: Counts): void }) {
  const account = useAccount(); const ui = useUi(); const { palette: p } = useAppTheme(); const uid = account.user?.uid;
  const [preview, setPreview] = useState<SyncPreview | null>(null); const [choices, setChoices] = useState<SyncChoices>({});
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [linked, setLinked] = useState<boolean | null>(null); const [details, setDetails] = useState(false);
  const locked = useRef(false); const lifecycle = useRef({ epoch: 0, active: true });
  useEffect(() => {
    const state = lifecycle.current; state.epoch++; state.active = true; cloudSync.cancel();
    return () => { state.epoch++; state.active = false; cloudSync.cancel(); };
  }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (uid) cloudSync.status().then(status => { if (active) { setLastSync(status.lastSync); setLinked(status.linked); } }).catch(reason => { if (active) setError(syncErrorMessage(reason)); });
    return () => { active = false; };
  }, [uid]));
  async function action(kind: string, operation: (active: () => boolean) => Promise<void>) {
    if (locked.current) return;
    locked.current = true; const attempt = lifecycle.current.epoch; const active = () => lifecycle.current.active && attempt === lifecycle.current.epoch;
    setBusy(kind); setError(''); setNotice('');
    try { await operation(active); }
    catch (reason) { if (active()) { setError(syncErrorMessage(reason)); setPreview(null); } }
    finally { locked.current = false; if (active()) setBusy(''); }
  }
  let review: ReturnType<typeof cloudSync.review> | null = null;
  if (preview && preview.uid === uid) { try { review = cloudSync.review(preview.token, choices); } catch { /* A new session needs a new preview. */ } }
  const disabled = !account.ready || !!account.busy || !!busy;
  return <View style={ui.card}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <IconBadge name="cloud-outline" /><View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text accessibilityRole="header" style={ui.cardTitle}>Sua jornada na nuvem</Text>
        <Text style={ui.eyebrow}>SINCRONIZAÇÃO MANUAL</Text>
      </View>
    </View>
    <Text style={ui.body}>Leve sua jornada para outro aparelho usando a mesma conta. Confira as alterações antes de enviar ou receber.</Text>
    {!uid ? <ActionButton secondary label="Entrar para sincronizar" disabled={disabled} onPress={() => router.navigate('/account')} /> : <>
      <Text selectable style={ui.body}>Conta: {account.user?.email || account.user?.name || 'Sua conta'}</Text>
      <View style={{ borderRadius: 14, padding: 14, gap: 5, backgroundColor: p.accentSurface, borderWidth: 1, borderColor: p.accentBorder }}>
        <Text style={[ui.cardTitle, { color: p.accent }]}>{lastSync ? 'Última sincronização concluída' : 'Prepare sua primeira sincronização'}</Text>
        <Text style={ui.body}>{lastSync ? new Date(lastSync).toLocaleString('pt-BR') : 'Nenhum envio automático. Você confere e confirma aqui.'}</Text>
        {lastSync && <Text style={ui.body}>Mudanças feitas depois desse horário precisam de uma nova conferência.</Text>}
      </View>
      {linked === false && <Text style={ui.body}>Na primeira confirmação, os dados deste aparelho serão vinculados a esta conta. Outra conta não poderá sincronizar esta mesma coleção local. Favoritos e textos pessoais são enviados ao Firebase para recuperar sua jornada.</Text>}
      <ActionButton secondary label="Conferir sincronização" disabled={disabled} busy={busy === 'prepare'} onPress={() => void action('prepare', async active => {
        setPreview(null); setChoices({}); const next = await cloudSync.prepare(); if (active()) setPreview(next);
      })} />
      {preview && review && <View style={{ gap: 14 }}>
        <Text accessibilityRole="header" style={ui.cardTitle}>{preview.first ? 'Confira o primeiro vínculo' : review.send || review.receive ? 'Confira as alterações' : 'Tudo em dia nesta conferência'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <ChangeCount title="Para enviar" count={review.send} /><ChangeCount title="Para receber" count={review.receive} />
        </View>
        <Text style={ui.body}>Neste aparelho: {countsText(preview.localCounts)}</Text>
        <Text style={ui.body}>{preview.hasCloud ? 'Na sua conta: ' + countsText(preview.cloudCounts) : 'Sua conta ainda não tem uma cópia. Esta será a primeira.'}</Text>
        {!!(review.removeLocal || review.removeCloud) && <View style={{ borderWidth: 1, borderColor: p.danger, borderRadius: 14, padding: 14, gap: 6 }}>
          <Text style={[ui.cardTitle, { color: p.danger }]}>Confira as remoções</Text>
          <Text style={ui.body}>Esta confirmação inclui {review.removeLocal} remoções ou desmarcações neste aparelho e {review.removeCloud} na nuvem. Você pode cancelar para guardar um backup antes.</Text>
        </View>}
        {!review.send && !review.receive && <Text style={ui.body}>Nenhuma alteração para enviar ou receber com as escolhas atuais. Conclua para registrar esta conferência.</Text>}
        {preview.conflicts.map(conflict => <View key={conflict.key} style={[ui.card, { borderWidth: 1, borderColor: p.border }]}>
          <Text style={ui.cardTitle}>{conflict.label}</Text>
          <Text style={ui.body}>Neste aparelho</Text><Text selectable style={ui.body}>{conflict.local}</Text>
          <Text style={ui.body}>Na nuvem</Text><Text selectable style={ui.body}>{conflict.cloud}</Text>
          <ActionButton secondary disabled={disabled} label={choices[conflict.key] === 'local' ? 'Selecionado: manter deste aparelho' : 'Manter versão deste aparelho'} onPress={() => setChoices(value => ({ ...value, [conflict.key]: 'local' }))} />
          <ActionButton secondary disabled={disabled} label={choices[conflict.key] === 'cloud' ? 'Selecionado: manter da nuvem' : 'Manter versão da nuvem'} onPress={() => setChoices(value => ({ ...value, [conflict.key]: 'cloud' }))} />
        </View>)}
        {!!review.unresolved && <Text style={ui.body}>Escolha a versão de {review.unresolved} registros diferentes para continuar.</Text>}
        <Text style={ui.body}>Lembretes são configurados por aparelho. Compromissos novos ou alterados pela nuvem precisam ser revisados na agenda. Aparência, histórico de navegação e progresso de mentorias não entram nesta versão.</Text>
        <ActionButton label="Confirmar sincronização" disabled={disabled || !!review.unresolved} busy={busy === 'confirm'} onPress={() => void action('confirm', async active => {
          const result = await cloudSync.confirm(preview.token, choices);
          if (active()) {
            setLastSync(result.lastSync); setLinked(true); setPreview(null); onSynced(result.counts);
            setNotice((result.changed ? 'Jornada sincronizada com sua conta.' : 'Sua jornada já estava sincronizada.') + (result.reviewReminders ? ' Confira a agenda e salve os compromissos futuros para ativar os lembretes neste aparelho.' : ''));
          }
        })} />
        <ActionButton secondary label="Cancelar sincronização" disabled={disabled} onPress={() => { cloudSync.cancel(); setPreview(null); setChoices({}); }} />
      </View>}
    </>}
    <ActionButton secondary label={details ? 'Ocultar detalhes da sincronização' : 'O que é sincronizado?'} disabled={disabled} onPress={() => setDetails(value => !value)} />
    {details && <View style={{ gap: 8 }}>
      <Text style={ui.body}>Favoritos, anotações, planos e leituras concluídas, agenda, esboços e estudos com suas reflexões. Textos pessoais são enviados ao Firebase da sua conta.</Text>
      <Text style={ui.body}>Sem internet, continue usando o app e sincronize depois. Entre com a mesma conta no outro aparelho para recuperar sua jornada.</Text>
      <Text style={ui.body}>Remoções são combinadas depois do primeiro vínculo. Diferenças simultâneas precisam da sua escolha. A última sincronização não inclui alterações feitas depois dela.</Text>
    </View>}
    {!!error && <Text accessibilityRole="alert" style={{ color: p.danger, lineHeight: 23 }}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text>}
  </View>;
}
