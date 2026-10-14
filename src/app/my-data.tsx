import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, IconBadge, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { useAppTheme } from '@/components/app-theme';
import { backupRepository } from '@/services/backup';
import { backupCounts, type BackupPreview } from '@/services/backup-repository';
import { saveBackupFile, selectBackupFile } from '@/services/backup-files';

type Counts = ReturnType<typeof backupCounts>;
function CountsCard({ counts }: { counts: Counts }) {
  const ui = useUi();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
    {[['Favoritos', counts.favorites], ['Anotações', counts.notes], ['Planos', counts.plans], ['Leituras concluídas', counts.readings], ['Compromissos', counts.events], ['Esboços', counts.sermons], ['Estudos salvos', counts.studies], ['Reflexões de estudos', counts.studyNotes]].map(([label, count]) => <View key={label} style={[ui.card, { flexGrow: 1, minWidth: 110, padding: 14 }]}><Text style={ui.cardTitle}>{count}</Text><Text style={ui.body}>{label}</Text></View>)}
  </View>;
}
export default function MyDataScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme();
  const [counts, setCounts] = useState<Counts | null>(null); const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [fileName, setFileName] = useState(''); const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [showConflicts, setShowConflicts] = useState(false); const locked = useRef(false); const focused = useRef(false);
  const noteConflicts = preview ? [...preview.notes.map(note => ({ ...note, type: 'Versículo' })), ...preview.studyNotes.map(note => ({ ...note, type: 'Estudo' }))] : [];
  useFocusEffect(useCallback(() => {
    focused.current = true;
    backupRepository.current().then(value => { if (focused.current) { setCounts(value); setError(''); } }).catch(() => { if (focused.current) setError('Não foi possível ler seus dados. Eles foram preservados. Tente novamente.'); });
    return () => { focused.current = false; };
  }, []));
  async function action(kind: string, operation: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(kind); setError(''); setMessage('');
    try { await operation(); }
    catch (reason) { if (focused.current) setError(reason instanceof Error ? reason.message : 'Não foi possível concluir. Tente novamente.'); }
    finally { locked.current = false; setBusy(''); }
  }
  async function exportData() {
    const result = await backupRepository.export();
    const name = 'biblia-smart-backup-' + result.file.createdAt.replace(/[:.]/g, '-') + '.json';
    const destination = await saveBackupFile(result.text, name);
    if (focused.current) setMessage(destination === 'download' ? 'Download solicitado. Confira o arquivo na pasta de downloads.' : 'Menu de compartilhamento aberto. Guarde o arquivo no destino escolhido para concluir seu backup.');
  }
  async function importData() {
    setPreview(null); setFileName(''); setShowConflicts(false);
    const selected = await selectBackupFile(); if (!selected) return;
    const next = await backupRepository.preview(selected.text);
    if (focused.current) { setPreview(next); setFileName(selected.name); }
  }
  async function restoreData() {
    if (!preview) return;
    const result = await backupRepository.restore(preview);
    if (focused.current) {
      setCounts(backupCounts(result.merged)); setPreview(null);
      setMessage('Restauração concluída. Dados combinados sem duplicação. ' + (result.notes.length || result.studyNotes.length || result.eventConflicts || result.sermonConflicts ? 'Os registros atuais em conflito foram mantidos. ' : '') + (result.addedEvents ? 'Confira os compromissos importados na agenda e edite os futuros para ativar os lembretes neste aparelho.' : ''));
    }
  }
  return <MinisterialScreen title="Meus dados" backTo="/profile" preferBackTo>
    <View style={ui.card}><IconBadge name="shield-checkmark-outline" /><Text style={ui.heading}>Sua jornada com você.</Text><Text style={ui.body}>Guarde uma cópia dos favoritos, anotações, planos, agenda, esboços e estudos com suas reflexões. Restaure no mesmo aparelho ou leve para outro celular.</Text></View>
    <Text accessibilityRole="header" style={ui.heading}>Salvos neste aparelho</Text>
    {counts ? <CountsCard counts={counts} /> : <ActionButton secondary label="Carregar meus dados" disabled={!!busy} onPress={() => void action('load', async () => { setCounts(await backupRepository.current()); })} />}
    <View style={ui.card}><Text style={ui.cardTitle}>Guardar minha jornada</Text><Text style={ui.body}>O arquivo inclui suas anotações, reflexões de estudos e notas pessoais dos esboços. Você escolhe onde guardá-lo. O app não envia uma cópia automaticamente.</Text><ActionButton label="Exportar backup" busy={busy === 'export'} disabled={!!busy || !counts} onPress={() => void action('export', exportData)} /></View>
    <View style={ui.card}><Text style={ui.cardTitle}>Trazer um backup</Text><Text style={ui.body}>Selecione um arquivo da Bíblia Smart de até 8 MB. Confira a prévia antes de combinar os dados. Seus registros atuais serão mantidos.</Text><ActionButton secondary label="Selecionar arquivo de backup" busy={busy === 'import'} disabled={!!busy} onPress={() => void action('import', importData)} /></View>
    {!!error && <Text accessibilityRole="alert" style={{ color: p.danger, lineHeight: 23 }}>{error}</Text>}
    {!!message && <View style={ui.card}><Text accessibilityLiveRegion="polite" style={ui.body}>{message}</Text></View>}
    {preview && <View style={{ gap: 18 }}>
      <Text accessibilityRole="header" style={ui.heading}>Confira antes de restaurar</Text>
      <Text style={ui.body}>{fileName}{'\n'}Criado em {new Date(preview.backup.createdAt).toLocaleString('pt-BR')}</Text>
      <CountsCard counts={backupCounts(preview.backup.data)} />
      <View style={ui.card}><Text style={ui.cardTitle}>O que será acrescentado</Text><Text style={ui.body}>{preview.addedFavorites} favoritos • {preview.addedNotes} anotações • {preview.addedPlans} planos • {preview.addedReadings} leituras concluídas • {preview.addedEvents} compromissos • {preview.addedSermons} esboços • {preview.addedStudies} estudos salvos • {preview.addedStudyNotes} reflexões de estudos</Text><Text style={ui.body}>O progresso dos planos será combinado. Registros repetidos não serão duplicados; seu plano atual e os lembretes existentes serão preservados.</Text>
        {!!preview.addedEvents && <Text style={ui.body}>Lembretes dos compromissos importados precisam ser ativados neste aparelho. Após restaurar, edite os compromissos futuros na agenda e salve.</Text>}
        {!!(noteConflicts.length || preview.eventConflicts || preview.sermonConflicts) && <Text style={ui.body}>{preview.notes.length} anotações e {preview.studyNotes.length} reflexões diferentes, {preview.eventConflicts} compromissos e {preview.sermonConflicts} esboços com o mesmo identificador serão mantidos como estão no aparelho. O conteúdo original continua no arquivo de backup.</Text>}
        {!!noteConflicts.length && <ActionButton secondary label={showConflicts ? 'Ocultar anotações diferentes' : 'Ver anotações diferentes'} onPress={() => setShowConflicts(value => !value)} />}
      </View>
      {showConflicts && noteConflicts.map(note => <View key={note.type + ':' + note.reference} style={ui.card}><Text style={ui.cardTitle}>{note.type} • {note.reference}</Text><Text style={ui.body}>Neste aparelho</Text><Text selectable style={ui.body}>{note.current}</Text><Text style={ui.body}>No backup (você pode copiar este texto)</Text><Text selectable style={ui.body}>{note.incoming}</Text></View>)}
      <ActionButton label="Restaurar e combinar dados" busy={busy === 'restore'} disabled={!!busy} onPress={() => void action('restore', restoreData)} />
      <ActionButton secondary label="Cancelar restauração" disabled={!!busy} onPress={() => { setPreview(null); setFileName(''); setShowConflicts(false); }} />
    </View>}
    <FeatureLink title="Abrir minha agenda" description="Confira compromissos e lembretes." icon="calendar-outline" href="/agenda" />
  </MinisterialScreen>;
}
