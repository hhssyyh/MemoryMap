import type { HandwritingNote } from '../../types/handwriting';
import {
  clearHandwritingNotes,
  getHandwritingNote,
  saveHandwritingNote,
} from '../../utils/handwriting';

describe('handwriting note store', () => {
  const targetDiaryId = 'diary-1';
  const note: HandwritingNote = {
    engine: 'skia',
    strokes: [{ id: 's1', points: [], color: '#000', width: 2 }],
  };

  beforeEach(clearHandwritingNotes);

  it('stores a note under the selected diary id', () => {
    saveHandwritingNote(targetDiaryId, note);

    expect(getHandwritingNote(targetDiaryId)).toEqual(note);
  });

  it('does not expose the note through a different diary id', () => {
    saveHandwritingNote(targetDiaryId, note);

    expect(getHandwritingNote('diary-2')).toBeUndefined();
  });
});
