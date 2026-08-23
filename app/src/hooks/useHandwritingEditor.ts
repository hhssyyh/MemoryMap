import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { handwritingRepository } from '../data/HandwritingRepository';
import { cleanupHandwritingAssets } from '../data/handwritingAssetFiles';
import type { HandwritingDocument } from '../types/handwriting';
import {
  commitEditorChange,
  createEditorHistory,
  redoEditorChange,
  undoEditorChange,
  type EditorHistory,
} from '../utils/editorHistory';
import { SerializedDocumentSaver } from '../utils/serializedDocumentSaver';

export type SaveStatus = 'loading' | 'saved' | 'dirty' | 'saving' | 'error';

export function useHandwritingEditor(diaryId: string) {
  const [history, setHistory] = useState<EditorHistory<HandwritingDocument> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading');
  const [revision, setRevision] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const historyRef = useRef(history);
  const saverRef = useRef(new SerializedDocumentSaver<HandwritingDocument>());

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    historyRef.current = null;
    saverRef.current.reset();
    setHistory(null);
    setRevision(0);
    setSaveStatus('loading');
    handwritingRepository
      .loadOrCreate(diaryId)
      .then((document) => {
        if (cancelled) return;
        // At the beginning of a new editing session no undo stack can refer to
        // orphaned files from a previous session, so they are safe to collect.
        cleanupHandwritingAssets(diaryId, document.id, document);
        const loaded = createEditorHistory(document);
        historyRef.current = loaded;
        saverRef.current.reset();
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
  }, [diaryId, loadAttempt]);

  const retryLoad = useCallback(() => setLoadAttempt((attempt) => attempt + 1), []);

  const markChanged = useCallback(() => {
    const nextRevision = saverRef.current.markChanged();
    setRevision(nextRevision);
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
    if (!historyRef.current) return;
    try {
      await saverRef.current.save(
        () => historyRef.current?.present ?? null,
        (value) => handwritingRepository.save(value),
        force,
        setSaveStatus,
      );
    } catch {
      throw new Error('필기 문서를 저장하지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'inactive' || state === 'background') {
        void saveNow(true).catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [saveNow]);

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
    revision,
    commit,
    replaceWithoutHistory,
    undo,
    redo,
    saveNow,
    retrySave: saveNow,
    retryLoad,
  };
}
