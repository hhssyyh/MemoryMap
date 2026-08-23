import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  applyInkChange,
  replaceInkSnapshot,
  InkRevisionMismatchError,
  NativeInkView as NativeInkViewNative,
  type InkChange,
  type InkError,
  type InkSnapshot,
} from 'native-ink-view';

import type { InkStroke } from '../../types/handwriting';
import type { EditorTool } from './SkiaInkCanvas';

type NativeInkCanvasProps = {
  pageId: string;
  strokes: InkStroke[];
  pageWidth: number;
  pageHeight: number;
  tool: EditorTool;
  color: string;
  width: number;
  fingerDrawing: boolean;
  onStrokesChange: (pageId: string, strokes: InkStroke[]) => boolean | void;
  onError?: (error: InkError) => void;
};

export function NativeInkCanvas({
  pageId,
  strokes,
  pageWidth,
  pageHeight,
  tool,
  color,
  width,
  fingerDrawing,
  onStrokesChange,
  onError,
}: NativeInkCanvasProps) {
  const [snapshot, setSnapshot] = useState<InkSnapshot>(() => ({
    schemaVersion: 1,
    revision: 0,
    pageSize: { width: pageWidth, height: pageHeight },
    strokes,
  }));
  const snapshotRef = useRef(snapshot);
  const [resyncKey, setResyncKey] = useState(0);
  const selectedTool = tool === 'select' ? 'navigate' : tool;

  useEffect(() => {
    const next = replaceInkSnapshot(
      snapshotRef.current,
      { width: pageWidth, height: pageHeight },
      strokes,
    );
    if (next === snapshotRef.current) return;
    snapshotRef.current = next;
    setSnapshot(next);
  }, [pageHeight, pageWidth, strokes]);

  const handleChange = useCallback((change: InkChange) => {
    try {
      const previous = snapshotRef.current;
      const next = applyInkChange(previous, change);
      snapshotRef.current = next;
      setSnapshot(next);
      if (onStrokesChange(pageId, next.strokes) === false) {
        const rollback = replaceInkSnapshot(
          next,
          previous.pageSize,
          previous.strokes,
        );
        snapshotRef.current = rollback;
        setSnapshot(rollback);
      }
    } catch (error) {
      if (error instanceof InkRevisionMismatchError) {
        // Keeping the typed snapshot prop unchanged explicitly re-synchronizes
        // native state on the next render; stale deltas are never applied.
        onError?.({
          code: 'revisionMismatch',
          message: error.message,
          recoverable: true,
        });
        setResyncKey((key) => key + 1);
      }
    }
  }, [onError, onStrokesChange, pageId]);

  return (
    <View style={styles.container}>
      <NativeInkViewNative
        key={resyncKey}
        inputMode={fingerDrawing ? 'anyPointer' : 'stylusOnly'}
        onChange={handleChange}
        onError={onError}
        selectedColor={color}
        selectedTool={selectedTool}
        selectedWidth={width}
        snapshot={snapshot}
        style={styles.canvas}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1, backgroundColor: 'transparent' },
});
