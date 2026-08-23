import { buildInkStroke } from '../handwriting';
import type { InkPoint } from '../../types/handwriting';

describe('buildInkStroke', () => {
  const points: InkPoint[] = [
    { x: 0, y: 0, pressure: 0.5, timestamp: 1 },
    { x: 10, y: 10, pressure: 0.8, timestamp: 2 },
  ];

  it('carries the given points, color, and width through unchanged', () => {
    const stroke = buildInkStroke(points, '#000000', 4);

    expect(stroke.points).toBe(points);
    expect(stroke.color).toBe('#000000');
    expect(stroke.width).toBe(4);
    expect(stroke.tool).toBe('pen');
    expect(stroke.opacity).toBe(1);
  });

  it('assigns a unique id to each stroke', () => {
    const first = buildInkStroke(points, '#000000', 4);
    const second = buildInkStroke(points, '#000000', 4);

    expect(first.id).not.toBe(second.id);
  });
});
