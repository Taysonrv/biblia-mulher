import { bibleTextProvider, chapterTranslation, validReference, verseReference } from '../data/bible-text';
import type { ReadingEntry } from './reading-repository';

export function formatReadingShare(entry: ReadingEntry, includeNote = false) {
  if (!entry || !validReference(entry.book, entry.chapter, entry.verse)
    || typeof entry.note !== 'string' || entry.note.length > 2000 || typeof includeNote !== 'boolean') {
    throw Error('Confira o versículo antes de compartilhar.');
  }
  const title = verseReference(entry.verse, entry.book, entry.chapter);
  const parts = [title, bibleTextProvider.getChapter(entry.book, entry.chapter)![entry.verse - 1], chapterTranslation(entry.book, entry.chapter)];
  if (includeNote && entry.note.trim()) parts.push('Minha reflexão\n' + entry.note.trim());
  return { title, message: parts.join('\n\n') };
}
