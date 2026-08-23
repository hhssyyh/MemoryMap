export type SaveLifecycle = 'saving' | 'saved' | 'dirty' | 'error';

/** Serializes persistence and drains edits that arrive while a save is active. */
export class SerializedDocumentSaver<T> {
  private currentRevision = 0;
  private savedRevision = 0;
  private requestedRevision = 0;
  private forceRequested = false;
  private inFlight: Promise<void> | null = null;
  private generation = 0;

  get revision() {
    return this.currentRevision;
  }

  reset() {
    this.generation += 1;
    this.currentRevision = 0;
    this.savedRevision = 0;
    this.requestedRevision = 0;
    this.forceRequested = false;
    this.inFlight = null;
  }

  markChanged() {
    this.currentRevision += 1;
    return this.currentRevision;
  }

  async save(
    getValue: () => T | null,
    persist: (value: T) => Promise<unknown>,
    force = false,
    onLifecycle?: (state: SaveLifecycle) => void,
  ): Promise<void> {
    const generation = this.generation;
    this.requestedRevision = Math.max(this.requestedRevision, this.currentRevision);
    this.forceRequested ||= force;

    while (
      generation === this.generation &&
      (this.forceRequested || this.requestedRevision > this.savedRevision)
    ) {
      if (!this.inFlight) {
        const task = this.drain(generation, getValue, persist, onLifecycle).finally(() => {
          if (this.inFlight === task) this.inFlight = null;
        });
        this.inFlight = task;
      }
      await this.inFlight;
    }
  }

  private async drain(
    generation: number,
    getValue: () => T | null,
    persist: (value: T) => Promise<unknown>,
    onLifecycle?: (state: SaveLifecycle) => void,
  ) {
    if (generation !== this.generation) return;
    onLifecycle?.('saving');
    try {
      while (
        generation === this.generation &&
        (this.forceRequested || this.requestedRevision > this.savedRevision)
      ) {
        const savingRevision = this.requestedRevision;
        const value = getValue();
        if (value === null) return;
        this.forceRequested = false;
        await persist(value);
        if (generation !== this.generation) return;
        this.savedRevision = savingRevision;
        this.requestedRevision = Math.max(this.requestedRevision, this.currentRevision);
      }
      if (generation !== this.generation) return;
      onLifecycle?.(this.currentRevision === this.savedRevision ? 'saved' : 'dirty');
    } catch (error) {
      if (generation === this.generation) onLifecycle?.('error');
      throw error;
    }
  }
}
