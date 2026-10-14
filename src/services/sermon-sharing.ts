export async function shareSermon(message: string, title: string): Promise<'opened' | 'cancelled' | 'text'> {
  if (!message.trim() || !title.trim()) throw Error('Confira o texto antes de compartilhar.');
  // Browser preview provides selectable text. Android/iOS use the native share sheet.
  return 'text';
}
