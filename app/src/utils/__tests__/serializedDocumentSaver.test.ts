import { SerializedDocumentSaver } from '../serializedDocumentSaver';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('SerializedDocumentSaver', () => {
  it('saves the latest revision again when an edit arrives during persistence', async () => {
    const saver = new SerializedDocumentSaver<{ revision: number }>();
    let value = { revision: saver.markChanged() };
    const firstSave = deferred();
    const persisted: number[] = [];
    const persist = jest.fn(async (document: { revision: number }) => {
      persisted.push(document.revision);
      if (persisted.length === 1) await firstSave.promise;
    });

    const saving = saver.save(() => value, persist);
    await Promise.resolve();
    value = { revision: saver.markChanged() };
    firstSave.resolve();
    await saving;

    expect(persist).toHaveBeenCalledTimes(2);
    expect(persisted).toEqual([1, 2]);
  });

  it('retains dirty state after failure and succeeds on explicit retry', async () => {
    const saver = new SerializedDocumentSaver<Record<string, never>>();
    saver.markChanged();
    const lifecycle: string[] = [];
    const persist = jest.fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(undefined);

    await expect(saver.save(() => ({}), persist, false, (state) => lifecycle.push(state)))
      .rejects.toThrow('disk full');
    await saver.save(() => ({}), persist, true, (state) => lifecycle.push(state));

    expect(persist).toHaveBeenCalledTimes(2);
    expect(lifecycle).toEqual(['saving', 'error', 'saving', 'saved']);
  });

  it('does not let an old session completion mark a reset session as saved', async () => {
    const saver = new SerializedDocumentSaver<{ diary: string; revision: number }>();
    const oldSave = deferred();
    const oldLifecycle: string[] = [];
    const newLifecycle: string[] = [];
    const persisted: string[] = [];
    const oldDocument = { diary: 'old', revision: saver.markChanged() };

    const savingOld = saver.save(
      () => oldDocument,
      async (document) => {
        persisted.push(document.diary);
        await oldSave.promise;
      },
      false,
      (state) => oldLifecycle.push(state),
    );
    await Promise.resolve();

    saver.reset();
    const newDocument = { diary: 'new', revision: saver.markChanged() };
    await saver.save(
      () => newDocument,
      async (document) => { persisted.push(document.diary); },
      false,
      (state) => newLifecycle.push(state),
    );
    oldSave.resolve();
    await savingOld;

    await saver.save(
      () => newDocument,
      async (document) => { persisted.push(document.diary); },
      false,
      (state) => newLifecycle.push(state),
    );
    expect(persisted).toEqual(['old', 'new']);
    expect(oldLifecycle).toEqual(['saving']);
    expect(newLifecycle).toEqual(['saving', 'saved']);
  });
});
