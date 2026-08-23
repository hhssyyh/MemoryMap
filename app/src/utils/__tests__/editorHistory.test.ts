import {
  commitEditorChange,
  createEditorHistory,
  redoEditorChange,
  undoEditorChange,
} from '../editorHistory';

describe('editor history', () => {
  it('undoes and redoes document changes', () => {
    const initial = createEditorHistory({ pageCount: 1 });
    const changed = commitEditorChange(initial, { pageCount: 2 });
    const undone = undoEditorChange(changed);

    expect(undone.present.pageCount).toBe(1);
    expect(redoEditorChange(undone).present.pageCount).toBe(2);
  });

  it('drops redo entries after a new change', () => {
    const initial = createEditorHistory('first');
    const changed = commitEditorChange(initial, 'second');
    const undone = undoEditorChange(changed);
    const replaced = commitEditorChange(undone, 'third');

    expect(replaced.future).toEqual([]);
    expect(redoEditorChange(replaced)).toBe(replaced);
  });

  it('keeps only the configured number of undo entries', () => {
    let history = createEditorHistory(0);
    history = commitEditorChange(history, 1, 2);
    history = commitEditorChange(history, 2, 2);
    history = commitEditorChange(history, 3, 2);

    expect(history.past).toEqual([1, 2]);
  });
});
