import { FlexWidget, TextWidget, type WidgetTaskHandlerProps } from 'react-native-android-widget';
export function WordWidget() {
  return <FlexWidget style={{ width: 'match_parent', height: 'match_parent', backgroundColor: '#243E32', borderRadius: 22, padding: 18, justifyContent: 'space-between' }} accessibilityLabel="Bíblia Smart. Palavra e atalhos de leitura.">
    <TextWidget text="BÍBLIA SMART" style={{ color: '#CEB58A', fontSize: 12, fontWeight: 'bold' }} />
    <TextWidget text="O SENHOR é meu pastor, nada me faltará." maxLines={3} style={{ color: '#F7F4ED', fontSize: 19, fontWeight: '500' }} clickAction="OPEN_URI" clickActionData={{ uri: 'bibliamulher://online-bible?language=pt-BR&bookOrder=19&chapter=23' }} accessibilityLabel="Ler Salmos 23 na Bíblia Livre" />
    <TextWidget text="Salmos 23:1 · BLIVRE" style={{ color: '#CEB58A', fontSize: 12 }} />
    <FlexWidget style={{ flexDirection: 'row', flexGap: 12, flexGapColor: '#243E32' }}>
      <TextWidget text="Ler a Bíblia" style={{ color: '#F7F4ED', fontSize: 14, padding: 10, borderRadius: 12, backgroundColor: '#355743' }} clickAction="OPEN_URI" clickActionData={{ uri: 'bibliamulher://bible' }} accessibilityLabel="Abrir a Bíblia" />
      <TextWidget text="Harpa Cristã" style={{ color: '#F7F4ED', fontSize: 14, padding: 10, borderRadius: 12, backgroundColor: '#355743' }} clickAction="OPEN_URI" clickActionData={{ uri: 'bibliamulher://harpa' }} accessibilityLabel="Abrir a Harpa Cristã" />
    </FlexWidget>
  </FlexWidget>;
}
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetInfo.widgetName === 'BibliaSmartWord' && widgetAction !== 'WIDGET_DELETED') renderWidget(<WordWidget />);
}
