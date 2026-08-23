import type { InkChange, InkSnapshot, InkStroke } from './NativeInkView.types';

export class InkRevisionMismatchError extends Error {
  constructor(readonly expectedRevision: number, readonly baseRevision: number) {
    super(`Ink revision mismatch: expected ${expectedRevision}, received ${baseRevision}.`);
    this.name = 'InkRevisionMismatchError';
  }
}

/** Applies one native delta without ever replacing the document with stale data. */
export function applyInkChange(snapshot: InkSnapshot, change: InkChange): InkSnapshot {
  if (change.baseRevision !== snapshot.revision) {
    throw new InkRevisionMismatchError(snapshot.revision, change.baseRevision);
  }
  const removed = new Set(change.removedStrokeIds);
  const addedIds = new Set(change.addedStrokes.map((stroke) => stroke.id));
  return {
    ...snapshot,
    revision: snapshot.revision + 1,
    strokes: [
      ...snapshot.strokes.filter(
        (stroke) => !removed.has(stroke.id) && !addedIds.has(stroke.id),
      ),
      ...change.addedStrokes,
    ],
  };
}

function inkPointsEqual(left: InkStroke['points'], right: InkStroke['points']): boolean {
  return left.length === right.length && left.every((point, index) => {
    const other = right[index];
    if (!other) return false;
    return (
      point.x === other.x &&
      point.y === other.y &&
      point.pressure === other.pressure &&
      point.tiltX === other.tiltX &&
      point.tiltY === other.tiltY &&
      point.azimuth === other.azimuth &&
      point.timestamp === other.timestamp
    );
  });
}

/** Avoids resetting a native canvas when an unrelated document edit re-renders React. */
export function inkStrokesEqual(left: InkStroke[], right: InkStroke[]): boolean {
  return left === right || (left.length === right.length && left.every((stroke, index) => {
    const other = right[index];
    if (!other) return false;
    return (
      stroke.id === other.id &&
      stroke.tool === other.tool &&
      stroke.color === other.color &&
      stroke.width === other.width &&
      stroke.opacity === other.opacity &&
      inkPointsEqual(stroke.points, other.points)
    );
  }));
}

/**
 * Creates an explicit full-snapshot revision for undo, redo, page rotation, or
 * rejecting a native delta. Persistence revisions never enter this contract.
 */
export function replaceInkSnapshot(
  snapshot: InkSnapshot,
  pageSize: InkSnapshot['pageSize'],
  strokes: InkStroke[],
): InkSnapshot {
  if (
    snapshot.pageSize.width === pageSize.width &&
    snapshot.pageSize.height === pageSize.height &&
    inkStrokesEqual(snapshot.strokes, strokes)
  ) return snapshot;

  return {
    ...snapshot,
    revision: snapshot.revision + 1,
    pageSize,
    strokes,
  };
}
