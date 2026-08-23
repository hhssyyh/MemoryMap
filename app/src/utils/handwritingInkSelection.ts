import type { InkPoint, InkStroke } from '../types/handwriting';

type Point = Pick<InkPoint, 'x' | 'y'>;

function orientation(a: Point, b: Point, c: Point) {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
    ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}

export function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (!currentPoint || !previousPoint) continue;
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y) &&
      point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function strokeIntersectsPolygon(stroke: InkStroke, polygon: Point[]) {
  if (stroke.points.some((point) => pointInPolygon(point, polygon))) return true;
  for (let pointIndex = 1; pointIndex < stroke.points.length; pointIndex += 1) {
    const start = stroke.points[pointIndex - 1];
    const end = stroke.points[pointIndex];
    if (!start || !end) continue;
    for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex += 1) {
      const edgeStart = polygon[edgeIndex];
      const edgeEnd = polygon[(edgeIndex + 1) % polygon.length];
      if (edgeStart && edgeEnd && segmentsIntersect(start, end, edgeStart, edgeEnd)) return true;
    }
  }
  return false;
}

export function selectInkStrokeIds(strokes: InkStroke[], polygon: Point[]) {
  if (polygon.length < 3) return [];
  return strokes.filter((stroke) => strokeIntersectsPolygon(stroke, polygon)).map((stroke) => stroke.id);
}

export function getInkStrokeBounds(strokes: InkStroke[], selectedIds: ReadonlySet<string>) {
  const points = strokes.flatMap((stroke) => selectedIds.has(stroke.id) ? stroke.points : []);
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs), minY: Math.min(...ys),
    maxX: Math.max(...xs), maxY: Math.max(...ys),
  };
}

export function translateSelectedInkStrokes(
  strokes: InkStroke[],
  selectedIds: ReadonlySet<string>,
  requestedDelta: Point,
  pageSize: { width: number; height: number },
) {
  const bounds = getInkStrokeBounds(strokes, selectedIds);
  if (!bounds) return strokes;
  const dx = Math.max(-bounds.minX, Math.min(requestedDelta.x, pageSize.width - bounds.maxX));
  const dy = Math.max(-bounds.minY, Math.min(requestedDelta.y, pageSize.height - bounds.maxY));
  if (dx === 0 && dy === 0) return strokes;
  return strokes.map((stroke) => selectedIds.has(stroke.id) ? {
    ...stroke,
    points: stroke.points.map((point) => ({ ...point, x: point.x + dx, y: point.y + dy })),
  } : stroke);
}
