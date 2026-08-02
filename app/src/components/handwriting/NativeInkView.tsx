import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeInkView as NativeInkViewNative } from 'native-ink-view';
import type { NativeInkStrokePayload } from 'native-ink-view';

import { colors, spacing } from '../../constants/theme';
import type { InkStroke } from '../../types/handwriting';

function toInkStrokes(payload: NativeInkStrokePayload[]): InkStroke[] {
  return payload.map((stroke) => ({
    id: stroke.id,
    color: stroke.color,
    width: stroke.width,
    points: stroke.points.map((point) => ({
      x: point.x,
      y: point.y,
      pressure: point.pressure,
      timestamp: point.timestamp,
    })),
  }));
}

type NativeInkCanvasProps = {
  onStrokesChange?: (strokes: InkStroke[]) => void;
};

export function NativeInkCanvas({ onStrokesChange }: NativeInkCanvasProps) {
  const [clearTrigger, setClearTrigger] = useState(0);
  const latestStrokes = useRef<InkStroke[]>([]);

  function handleClear() {
    setClearTrigger((trigger) => trigger + 1);
  }

  return (
    <View style={styles.container}>
      <NativeInkViewNative
        drawingPolicy="anyInput"
        clearTrigger={clearTrigger}
        onDrawingChange={(event) => {
          const strokes = toInkStrokes(event.nativeEvent.strokes);
          latestStrokes.current = strokes;
          onStrokesChange?.(strokes);
        }}
        style={styles.canvas}
      />
      <View style={styles.toolbar}>
        <Pressable onPress={handleClear} style={styles.toolbarButton}>
          <Text style={styles.toolbarButtonText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  toolbarButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  toolbarButtonText: {
    fontWeight: '600',
    color: colors.primary,
  },
});
