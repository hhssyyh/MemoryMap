export const DEFAULT_HISTORY_LIMIT = 100;

export type EditorHistory<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function createEditorHistory<T>(initialValue: T): EditorHistory<T> {
  return { past: [], present: initialValue, future: [] };
}

export function commitEditorChange<T>(
  history: EditorHistory<T>,
  nextValue: T,
  limit = DEFAULT_HISTORY_LIMIT,
): EditorHistory<T> {
  if (Object.is(history.present, nextValue)) return history;
  return {
    past: [...history.past, history.present].slice(-limit),
    present: nextValue,
    future: [],
  };
}

export function undoEditorChange<T>(history: EditorHistory<T>): EditorHistory<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoEditorChange<T>(history: EditorHistory<T>): EditorHistory<T> {
  const [next, ...remaining] = history.future;
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: remaining,
  };
}
