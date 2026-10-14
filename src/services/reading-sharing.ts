export async function shareReading(message: string, title: string): Promise<'opened' | 'cancelled' | 'text'> {
  if (!message.trim() || !title.trim()) throw Error('Confira o texto antes de compartilhar.');
  return 'text';
}
