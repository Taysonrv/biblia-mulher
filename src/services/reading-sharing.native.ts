import { Share } from 'react-native';

export async function shareReading(message: string, title: string): Promise<'opened' | 'cancelled' | 'text'> {
  if (!message.trim() || !title.trim()) throw Error('Confira o texto antes de compartilhar.');
  const result = await Share.share({ message, title }, { dialogTitle: 'Compartilhar versículo', subject: title });
  return result.action === Share.dismissedAction ? 'cancelled' : 'opened';
}
