import type { HandwritingNote, InkPoint, InkStroke } from '../types/handwriting';

const notesByDiaryId = new Map<string, HandwritingNote>();

export function buildInkStroke(
  points: InkPoint[],
  color: string,
  width: number,
): InkStroke {
  return {
    id: `stroke-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    points,
    color,
    width,
  };
}

export function saveHandwritingNote(diaryId: string, note: HandwritingNote): void {
  notesByDiaryId.set(diaryId, note);
}

export function getHandwritingNote(diaryId: string): HandwritingNote | undefined {
  return notesByDiaryId.get(diaryId);
}

export function clearHandwritingNotes(): void {
  notesByDiaryId.clear();
}
