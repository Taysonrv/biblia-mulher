import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useAppTheme } from './app-theme';
import { useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { bibleBooks } from '@/data/bible-catalog';
import { readingReports } from '@/services/reading-reports';
import { summarizeReports, localDay, type ReportData } from '@/services/reading-reports-model';

function Donut({ value, total, label }: { value: number; total: number; label: string }) {
  const { palette: p } = useAppTheme(); const ui = useUi(); const radius = 35; const length = 2 * Math.PI * radius;
  return <View accessible accessibilityLabel={`${label}: ${value} de ${total}`} style={{ flex: 1, minWidth: 125, alignItems: 'center', gap: 6 }}>
    <View style={{ width: 94, height: 94, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={94} height={94} style={{ position: 'absolute' }}><Circle cx={47} cy={47} r={radius} stroke={p.border} strokeWidth={8} fill="none" />
        {value > 0 && <Circle cx={47} cy={47} r={radius} stroke={p.accent} strokeWidth={8} fill="none" strokeDasharray={`${length * Math.min(value / total, 1)} ${length}`} strokeLinecap="round" transform="rotate(-90 47 47)" />}</Svg>
      <Text style={[ui.cardTitle, { fontSize: 22 }]}>{value}</Text>
    </View><Text style={[ui.body, { textAlign: 'center' }]}>{label}</Text><Text style={[ui.body, { fontSize: 12 }]}>de {total}</Text>
  </View>;
}
export function ReadingReportCards() {
  const { palette: p } = useAppTheme(); const ui = useUi();
  const [data, setData] = useState<ReportData | null>(null); const [ready, setReady] = useState(false); const [error, setError] = useState(false); const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => { let active = true; setReady(false); if (attempt > 0) setError(false); readingReports.read().then(value => { if (active) setData(value); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, [attempt]));
  const report = summarizeReports(data); const max = Math.max(1, ...report.months.map(month => month.total));
  const points = report.months.map((month, i) => `${18 + i * 52},${96 - month.total / max * 72}`).join(' ');
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={ui.heading}>Seu ritmo de leitura</Text>
    <Text style={ui.body}>Atividade neste aparelho • {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Text>
    {!ready ? <Text style={ui.body}>Carregando relatórios…</Text> : error ? <View style={ui.card}><Text accessibilityRole="alert" style={ui.body}>Não foi possível carregar os relatórios. Seus registros foram preservados.</Text><ActionButton secondary label="Tentar novamente" onPress={() => setAttempt(value => value + 1)} /></View> : <>
      <View style={ui.card}><Text style={ui.cardTitle}>Presença no mês</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Donut value={report.activeDays} total={report.elapsedDays} label="Dias com leitura" /><Donut value={report.uniqueChapters} total={1189} label="Capítulos visitados" />
      </View><Text style={[ui.body, { fontSize: 12 }]}>Aberturas de capítulos, sem confirmação de conclusão. Cada capítulo conta uma vez por dia; o segundo anel conta capítulos diferentes no mês.</Text></View>
      <View style={ui.card}><Text style={ui.cardTitle}>Evolução mensal</Text><Text style={ui.body}>{report.total} {report.total === 1 ? 'visita a capítulo neste mês' : 'visitas a capítulos neste mês'}</Text>
        <View accessible accessibilityLabel={report.months.map(month => `${month.label}: ${month.total} visitas`).join('. ')}>
          <Svg width="100%" height={120} viewBox="0 0 296 120"><Line x1={18} y1={96} x2={278} y2={96} stroke={p.border} /><Polyline points={points} fill="none" stroke={p.accent} strokeWidth={3} />{report.months.map((month, i) => <Circle key={month.key} cx={18 + i * 52} cy={96 - month.total / max * 72} r={4} fill={p.accent} />)}</Svg>
          <View style={{ flexDirection: 'row' }}>{report.months.map(month => <View key={month.key} style={{ flex: 1, alignItems: 'center' }}><Text style={[ui.body, { fontSize: 12 }]}>{month.label}</Text><Text style={ui.cardTitle}>{month.total}</Text></View>)}</View>
        </View>
        <Text style={[ui.body, { fontSize: 12 }]}>{data ? `Contagem iniciada em ${new Date(data.startedAt).toLocaleDateString('pt-BR')}.` : 'Os dados começam a ser registrados nas próximas leituras.'} Meses anteriores à contagem não têm registros. Retenção de 400 dias, sem estimar tempo de leitura.</Text>
      </View>
    </>}
    <View style={ui.card}><Text style={ui.cardTitle}>Linha do tempo</Text>
      {!ready ? <Text style={ui.body}>Carregando atividades…</Text> : error ? <Text style={ui.body}>Recarregue os relatórios para ver a linha do tempo.</Text> : !(data?.days.length) ? <Text style={ui.body}>Abra um capítulo para começar sua jornada.</Text> : [...data.days].filter(day => day.date <= localDay(new Date())).reverse().slice(0, 4).map(day => {
        const [book, chapter] = day.chapters[0].split(':');
        return <Pressable key={day.date} accessibilityRole="button" accessibilityLabel={'Retomar ' + book + ' ' + chapter} onPress={() => router.push({ pathname: '/online-bible', params: { language: 'pt-BR', bookOrder: String(bibleBooks.findIndex(item => item.name === book) + 1), chapter } })} style={({ pressed }) => [{ borderLeftWidth: 2, borderLeftColor: p.accentBorder, paddingLeft: 14, paddingVertical: 10, minHeight: 48 }, pressed && ui.pressed]}>
          <Text style={ui.cardTitle}>{new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</Text><Text style={ui.body}>{day.chapters.length} {day.chapters.length === 1 ? 'capítulo visitado' : 'capítulos visitados'}</Text><Text style={[ui.body, { fontSize: 12 }]}>{day.chapters.slice(0, 2).map(key => key.replace(':', ' ')).join(' • ')}{day.chapters.length > 2 ? '…' : ''}</Text>
        </Pressable>;
      })}
      <Text style={[ui.body, { fontSize: 12 }]}>Últimos dias com atividade registrada. Toque para retomar a primeira passagem do dia em português BR.</Text>
    </View>
  </View>;
}
