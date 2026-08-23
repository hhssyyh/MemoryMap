import type { InkStroke } from '../../types/handwriting';
import {
  getInkStrokeBounds,
  selectInkStrokeIds,
  translateSelectedInkStrokes,
} from '../handwritingInkSelection';

const stroke = (id: string, points: Array<{ x: number; y: number }>): InkStroke => ({
  id, tool: 'pen', color: '#000', width: 2, opacity: 1,
  points: points.map((point, timestamp) => ({ ...point, timestamp })),
});

describe('ink lasso selection', () => {
  const strokes = [
    stroke('inside', [{ x: 20, y: 20 }, { x: 40, y: 40 }]),
    stroke('crossing', [{ x: 0, y: 50 }, { x: 100, y: 50 }]),
    stroke('outside', [{ x: 150, y: 150 }, { x: 180, y: 180 }]),
  ];
  const polygon = [
    { x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 },
  ];

  it('selects strokes inside or crossing the lasso', () => {
    expect(selectInkStrokeIds(strokes, polygon)).toEqual(['inside', 'crossing']);
  });

  it('moves only selected strokes and clamps the group to the page', () => {
    const selected = new Set(['inside', 'crossing']);
    const translated = translateSelectedInkStrokes(
      strokes,
      selected,
      { x: -100, y: 500 },
      { width: 200, height: 200 },
    );
    expect(getInkStrokeBounds(translated, selected)).toEqual({ minX: 0, minY: 170, maxX: 100, maxY: 200 });
    expect(translated[2]).toBe(strokes[2]);
  });
});
