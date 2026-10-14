import type { SavedSermon } from './sermon-repository';

export type PresentationSection = { id: string; title: string; body: string };
export const PRESENTATION_FONT_SIZES = [20, 24, 28, 32] as const;

// View model only: presenting never writes to the saved message or its revision.
export function presentationSections(message: SavedSermon, includeNotes = false): PresentationSection[] {
  const outline = message.outline;
  const sections: PresentationSection[] = [
    { id: 'base', title: 'Texto-base', body: `${outline.theme}\n\n${outline.baseText}` },
    { id: 'introduction', title: 'Introdução', body: outline.introduction },
    ...outline.points.map((point, index) => ({ id: `point-${index + 1}`, title: point.title, body: point.body })),
    { id: 'application', title: 'Aplicação', body: outline.application },
    { id: 'conclusion', title: 'Conclusão', body: outline.conclusion },
    { id: 'references', title: 'Referências relacionadas', body: outline.references.map(ref => `• ${ref}`).join('\n\n') },
    { id: 'questions', title: 'Perguntas para reflexão', body: outline.questions.map((question, index) => `${index + 1}. ${question}`).join('\n\n') },
  ];
  if (includeNotes && message.notes.trim()) sections.push({ id: 'notes', title: 'Minhas notas pessoais', body: message.notes });
  return sections;
}

export function presentationPosition(sections: readonly PresentationSection[], id: string): number {
  return Math.max(0, sections.findIndex(section => section.id === id));
}

export function movePresentation(sections: readonly PresentationSection[], id: string, direction: -1 | 1): string {
  const position = presentationPosition(sections, id);
  return sections[Math.max(0, Math.min(sections.length - 1, position + direction))]?.id ?? 'base';
}
