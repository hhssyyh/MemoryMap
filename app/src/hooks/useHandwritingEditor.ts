import { useCallback, useEffect, useRef, useState } from 'react';

import { handwritingRepository } from '../data/HandwritingRepository';
import type { HandwritingDocument } from '../types/handwriting';
import {
  commitEditorChange,
  createEditorHistory,
  redoEditorChange,
  undoEditorChange,
  type EditorHistory,
} from '../utils/editorHistory';

export type SaveStatus = 'loading' | 'saved' | 'dirty' | 'saving' | 'error';

export function useHandwritingEditor(diaryId: string) {
  const [history, setHistory] = useState<EditorHistory<HandwritingDocument> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading');
  const [revision, setRevision] = useState(0);
  const historyRef = useRef(history);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    setSaveStatus('loading');
    handwritingRepository
      .loadOrCreate(diaryId)
      .then((document) => {
        if (cancelled) return;
        const loaded = createEditorHistory(document);
        historyRef.current = loaded;
        revisionRef.current = 0;
        savedRevisionRef.current = 0;
        setRevision(0);
        setHistory(loaded);
        setSaveStatus('saved');
      })
      .catch(() => {
        if (!cancelled) setSaveStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [diaryId]);

  const markChanged = useCallback(() => {
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    setSaveStatus('dirty');
  }, []);

  const commit = useCallback(
    (update: (document: HandwritingDocument) => HandwritingDocument) => {
      const current = historyRef.current;
      if (!current) return;
      const nextDocument = update(current.present);
      const nextHistory = commitEditorChange(current, nextDocument);
      if (nextHistory === current) return;
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      markChanged();
    },
    [markChanged],
  );

  const undo = useCallback(() => {
    const current = historyRef.current;
    if (!current) return;
    const next = undoEditorChange(current);
    if (next === current) return;
    historyRef.current = next;
    setHistory(next);
    markChanged();
  }, [markChanged]);

  const redo = useCallback(() => {
    const current = historyRef.current;
    if (!current) return;
    const next = redoEditorChange(current);
    if (next === current) return;
    historyRef.current = next;
    setHistory(next);
    markChanged();
  }, [markChanged]);

  /**
   * 썸네일이나 현재 페이지처럼 편집 이력에 포함하면 안 되는 메타데이터를 교체한다.
   * markDirty=false는 이미 예약된 자동 저장의 기준 시점을 유지할 때 사용한다.
   */
  const replaceWithoutHistory = useCallback(
    (
      update: (document: HandwritingDocument) => HandwritingDocument,
      markDirty = true,
    ) => {
      const current = historyRef.current;
      if (!current) return;
      const nextDocument = update(current.present);
      if (nextDocument === current.present) return;
      const nextHistory = { ...current, present: nextDocument };
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      if (markDirty) markChanged();
    },
    [markChanged],
  );

  const saveNow = useCallback(async (force = false) => {
    const current = historyRef.current;
    if (!current || (!force && revisionRef.current === savedRevisionRef.current)) return;
    const savingRevision = revisionRef.current;
    setSaveStatus('saving');
    try {
      await handwritingRepository.save(current.present);
      savedRevisionRef.current = savingRevision;
      setSaveStatus(revisionRef.current === savingRevision ? 'saved' : 'dirty');
    } catch {
      setSaveStatus('error');
      throw new Error('필기 문서를 저장하지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    if (saveStatus !== 'dirty') return;
    const timer = setTimeout(() => {
      void saveNow().catch(() => undefined);
    }, 1000);
    return () => clearTimeout(timer);
  }, [revision, saveNow, saveStatus]);

  return {
    document: history?.present ?? null,
    canUndo: Boolean(history?.past.length),
    canRedo: Boolean(history?.future.length),
    saveStatus,
    commit,
    replaceWithoutHistory,
    undo,
    redo,
    saveNow,
  };
}
