import { Share } from 'react-native';
export async function shareSermon(message: string, title: string): Promise<'opened' | 'cancelled' | 'text'> {
  const result = await Share.share({ message, title }, { dialogTitle: 'Compartilhar esboço', subject: title });
  return result.action === Share.dismissedAction ? 'cancelled' : 'opened';
}
