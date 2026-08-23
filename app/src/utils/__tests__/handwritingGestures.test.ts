import {
  resizeLayerFromCorner,
  rotationDeltaDegrees,
  screenDeltaToPageDelta,
  viewportTransformFromPointers,
  type ResizeCorner,
} from '../handwritingGestures';

function visualCorner(
  transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number },
  size: { width: number; height: number },
  corner: ResizeCorner,
) {
  const signs = {
    topLeft: [-1, -1], topRight: [1, -1], bottomLeft: [-1, 1], bottomRight: [1, 1],
  } as const;
  const [signX, signY] = signs[corner];
  const width = size.width * transform.scaleX;
  const height = size.height * transform.scaleY;
  const radians = transform.rotation * Math.PI / 180;
  const localX = signX * width / 2;
  const localY = signY * height / 2;
  return {
    x: transform.x + width / 2 + localX * Math.cos(radians) - localY * Math.sin(radians),
    y: transform.y + height / 2 + localX * Math.sin(radians) + localY * Math.cos(radians),
  };
}

describe('layer corner resizing', () => {
  it('maps screen deltas through inverse viewport scale and rotation', () => {
    const delta = screenDeltaToPageDelta(
      { x: 0, y: 100 },
      { scale: 2, rotation: 90 },
      { x: 3, y: 4 },
    );
    expect(delta.x).toBeCloseTo(150, 8);
    expect(delta.y).toBeCloseTo(0, 8);
  });

  it('uses the angle around the layer center for precise rotation', () => {
    expect(rotationDeltaDegrees(
      { x: 100, y: 100 },
      { x: 100, y: 50 },
      { x: 150, y: 100 },
    )).toBe(90);
    expect(rotationDeltaDegrees(
      { x: 0, y: 0 },
      { x: -1, y: -0.01 },
      { x: -1, y: 0.01 },
    )).toBeCloseTo(-1.145877, 5);
  });

  it('pans, scales, and rotates the viewport from touch pointers', () => {
    expect(viewportTransformFromPointers(
      { x: 10, y: 20, scale: 1, rotation: 0 },
      [{ x: 100, y: 100 }],
      [{ x: 130, y: 80 }],
    )).toEqual({ x: 40, y: 0, scale: 1, rotation: 0 });

    const transformed = viewportTransformFromPointers(
      { x: 10, y: 20, scale: 1, rotation: 5 },
      [{ x: 50, y: 100 }, { x: 150, y: 100 }],
      [{ x: 100, y: 50 }, { x: 100, y: 250 }],
    );
    expect(transformed).toMatchObject({ x: 10, y: 70, scale: 2, rotation: 95 });
  });

  it.each([
    ['topLeft', 'bottomRight'],
    ['topRight', 'bottomLeft'],
    ['bottomLeft', 'topRight'],
    ['bottomRight', 'topLeft'],
  ] as Array<[ResizeCorner, ResizeCorner]>)('keeps the opposite corner fixed from %s', (dragged, fixed) => {
    const size = { width: 320, height: 180 };
    const start = { x: 120, y: 240, scaleX: 1, scaleY: 1, rotation: 32 };
    const before = visualCorner(start, size, fixed);
    const resized = resizeLayerFromCorner(start, size, { x: 90, y: 45 }, dragged);
    const after = visualCorner(resized, size, fixed);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(resized.scaleX).toBeCloseTo(resized.scaleY, 8);
  });

  it('clamps uniform scale to the supported range', () => {
    const start = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    expect(resizeLayerFromCorner(start, { width: 100, height: 100 }, { x: -1000, y: -1000 }, 'bottomRight').scaleX).toBe(0.1);
    expect(resizeLayerFromCorner(start, { width: 100, height: 100 }, { x: 1000, y: 1000 }, 'bottomRight').scaleX).toBe(6);
  });
});
