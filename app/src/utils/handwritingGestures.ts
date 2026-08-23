import type { LayerTransform } from '../types/handwriting';

export type ResizeCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export function screenDeltaToPageDelta(
  delta: { x: number; y: number },
  viewport: { scale: number; rotation: number },
  pageScale: { x: number; y: number },
) {
  const radians = (-viewport.rotation * Math.PI) / 180;
  const unrotated = rotateVector(delta.x, delta.y, radians);
  const viewportScale = Math.max(0.0001, viewport.scale);
  return {
    x: (unrotated.x / viewportScale) * pageScale.x,
    y: (unrotated.y / viewportScale) * pageScale.y,
  };
}

export function rotationDeltaDegrees(
  center: { x: number; y: number },
  start: { x: number; y: number },
  current: { x: number; y: number },
) {
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const currentAngle = Math.atan2(current.y - center.y, current.x - center.x);
  let delta = ((currentAngle - startAngle) * 180) / Math.PI;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

export function viewportTransformFromPointers(
  start: { x: number; y: number; scale: number; rotation: number },
  initial: ReadonlyArray<{ x: number; y: number }>,
  current: ReadonlyArray<{ x: number; y: number }>,
) {
  const firstInitial = initial[0];
  const firstCurrent = current[0];
  if (!firstInitial || !firstCurrent) return start;
  if (initial.length < 2 || current.length < 2) {
    return {
      ...start,
      x: start.x + firstCurrent.x - firstInitial.x,
      y: start.y + firstCurrent.y - firstInitial.y,
    };
  }

  const secondInitial = initial[1]!;
  const secondCurrent = current[1]!;
  const initialCenter = {
    x: (firstInitial.x + secondInitial.x) / 2,
    y: (firstInitial.y + secondInitial.y) / 2,
  };
  const currentCenter = {
    x: (firstCurrent.x + secondCurrent.x) / 2,
    y: (firstCurrent.y + secondCurrent.y) / 2,
  };
  const initialDistance = Math.hypot(
    secondInitial.x - firstInitial.x,
    secondInitial.y - firstInitial.y,
  );
  const currentDistance = Math.hypot(
    secondCurrent.x - firstCurrent.x,
    secondCurrent.y - firstCurrent.y,
  );
  return {
    x: start.x + currentCenter.x - initialCenter.x,
    y: start.y + currentCenter.y - initialCenter.y,
    scale: Math.max(0.5, Math.min(4, start.scale * currentDistance / Math.max(1, initialDistance))),
    rotation: start.rotation + rotationDeltaDegrees(
      initialCenter,
      firstInitial,
      {
        x: initialCenter.x + firstCurrent.x - currentCenter.x,
        y: initialCenter.y + firstCurrent.y - currentCenter.y,
      },
    ),
  };
}

const CORNER_SIGN: Record<ResizeCorner, { x: -1 | 1; y: -1 | 1 }> = {
  topLeft: { x: -1, y: -1 },
  topRight: { x: 1, y: -1 },
  bottomLeft: { x: -1, y: 1 },
  bottomRight: { x: 1, y: 1 },
};

function rotateVector(x: number, y: number, radians: number) {
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  };
}

/**
 * Uniformly resizes a rotated layer while keeping the opposite visual corner
 * fixed. The returned transform remains a preview; page-boundary constraints
 * are applied once by the document commit.
 */
export function resizeLayerFromCorner(
  start: LayerTransform,
  layerSize: { width: number; height: number },
  delta: { x: number; y: number },
  corner: ResizeCorner,
): LayerTransform {
  const sign = CORNER_SIGN[corner];
  const radians = (start.rotation * Math.PI) / 180;
  const localDelta = rotateVector(delta.x, delta.y, -radians);
  const width = layerSize.width * start.scaleX;
  const height = layerSize.height * start.scaleY;
  const cornerVector = { x: sign.x * width, y: sign.y * height };
  const draggedVector = {
    x: cornerVector.x + localDelta.x,
    y: cornerVector.y + localDelta.y,
  };
  const rawFactor =
    (draggedVector.x * cornerVector.x + draggedVector.y * cornerVector.y) /
    Math.max(1, cornerVector.x ** 2 + cornerVector.y ** 2);
  const maxFactor = Math.min(6 / Math.max(0.0001, start.scaleX), 6 / Math.max(0.0001, start.scaleY));
  const minFactor = Math.max(0.1 / Math.max(0.0001, start.scaleX), 0.1 / Math.max(0.0001, start.scaleY));
  const factor = Math.max(minFactor, Math.min(maxFactor, rawFactor));
  const nextWidth = width * factor;
  const nextHeight = height * factor;
  const startCenter = { x: start.x + width / 2, y: start.y + height / 2 };
  const anchorOffset = rotateVector(-sign.x * width / 2, -sign.y * height / 2, radians);
  const fixedCorner = {
    x: startCenter.x + anchorOffset.x,
    y: startCenter.y + anchorOffset.y,
  };
  const nextCenterOffset = rotateVector(sign.x * nextWidth / 2, sign.y * nextHeight / 2, radians);
  const nextCenter = {
    x: fixedCorner.x + nextCenterOffset.x,
    y: fixedCorner.y + nextCenterOffset.y,
  };
  return {
    ...start,
    x: nextCenter.x - nextWidth / 2,
    y: nextCenter.y - nextHeight / 2,
    scaleX: start.scaleX * factor,
    scaleY: start.scaleY * factor,
  };
}
