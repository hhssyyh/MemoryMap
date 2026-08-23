import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeInkView as NativeInkViewNative } from 'native-ink-view';
import type { NativeInkStrokePayload } from 'native-ink-view';

import type { InkStroke } from '../../types/handwriting';
import type { EditorTool } from './SkiaInkCanvas';

function toInkStrokes(payload: NativeInkStrokePayload[]): InkStroke[] {
  return payload.map((stroke) => ({
    id: stroke.id,
    tool: stroke.tool,
    color: stroke.color,
    width: stroke.width,
    opacity: stroke.opacity,
    points: stroke.points.map((point) => ({
      x: point.x,
      y: point.y,
      pressure: point.pressure,
      tiltX: point.tiltX,
      tiltY: point.tiltY,
      azimuth: point.azimuth,
      timestamp: point.timestamp,
    })),
  }));
}

type NativeInkCanvasProps = {
  strokes: InkStroke[];
  pageWidth: number;
  pageHeight: number;
  tool: EditorTool;
  color: string;
  width: number;
  fingerDrawing: boolean;
  onStrokesChange: (strokes: InkStroke[]) => void;
};

export function NativeInkCanvas({
  strokes,
  pageWidth,
  pageHeight,
  tool,
  color,
  width,
  fingerDrawing,
  onStrokesChange,
}: NativeInkCanvasProps) {
  const strokesJson = useMemo(() => JSON.stringify(strokes), [strokes]);
  const selectedTool = tool === 'select' ? 'navigate' : tool;

  return (
    <View style={styles.container}>
      <NativeInkViewNative
        drawingPolicy={fingerDrawing ? 'anyInput' : 'pencilOnly'}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        selectedTool={selectedTool}
        selectedColor={color}
        selectedWidth={width}
        strokesJson={strokesJson}
        onDrawingChange={(event) => onStrokesChange(toInkStrokes(event.nativeEvent.strokes))}
        style={styles.canvas}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1, backgroundColor: 'transparent' },
});
