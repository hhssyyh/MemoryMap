import {
  applyInkChange,
  inkStrokesEqual,
  InkRevisionMismatchError,
  replaceInkSnapshot,
} from '../../../modules/native-ink-view/src/inkReducer';
import type {
  InkSnapshot,
  InkStroke,
} from '../../../modules/native-ink-view/src/NativeInkView.types';

const stroke = (id: string): InkStroke => ({
  id,
  tool: 'pen',
  color: '#000000',
  width: 4,
  opacity: 1,
  points: [{ x: 1, y: 2, pressure: 0.5, timestamp: 0 }],
});

describe('native ink snapshot/change contract', () => {
  const snapshot: InkSnapshot = {
    schemaVersion: 1,
    revision: 7,
    pageSize: { width: 900, height: 1200 },
    strokes: [stroke('keep'), stroke('remove')],
  };

  it('applies added and removed strokes as one revision', () => {
    const next = applyInkChange(snapshot, {
      baseRevision: 7,
      changeId: 'change-1',
      addedStrokes: [stroke('add')],
      removedStrokeIds: ['remove'],
    });

    expect(next.revision).toBe(8);
    expect(next.strokes.map(({ id }) => id)).toEqual(['keep', 'add']);
  });

  it('rejects a stale native delta so the caller can send a full snapshot', () => {
    expect(() => applyInkChange(snapshot, {
      baseRevision: 6,
      changeId: 'stale',
      addedStrokes: [stroke('stale')],
      removedStrokeIds: [],
    })).toThrow(InkRevisionMismatchError);
    expect(snapshot.strokes.map(({ id }) => id)).toEqual(['keep', 'remove']);
  });

  it('does not create an ink revision for an equivalent persistence re-render', () => {
    const copiedStrokes = snapshot.strokes.map((item) => ({
      ...item,
      points: item.points.map((point) => ({ ...point })),
    }));

    expect(inkStrokesEqual(snapshot.strokes, copiedStrokes)).toBe(true);
    expect(replaceInkSnapshot(snapshot, snapshot.pageSize, copiedStrokes)).toBe(snapshot);
  });

  it('creates one full-snapshot revision for undo or page rotation', () => {
    const replacement = replaceInkSnapshot(
      snapshot,
      { width: 1200, height: 900 },
      [stroke('keep')],
    );

    expect(replacement.revision).toBe(8);
    expect(replacement.pageSize).toEqual({ width: 1200, height: 900 });
    expect(replacement.strokes.map(({ id }) => id)).toEqual(['keep']);
  });
});
