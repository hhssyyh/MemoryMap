import { useMemo, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';

import { colors, spacing } from '../../constants/theme';
import { buildInkStroke } from '../../utils/handwriting';
import type { InkPoint, InkStroke } from '../../types/handwriting';

const STROKE_COLOR = colors.text;
const BASE_STROKE_WIDTH = 3;

function pointsToSkPath(points: InkPoint[]): SkPath {
  const path = Skia.Path.Make();
  const [first, ...rest] = points;
  if (!first) return path;
  path.moveTo(first.x, first.y);
  for (const point of rest) {
    path.lineTo(point.x, point.y);
  }
  return path;
}

function pressureToWidth(points: InkPoint[]): number {
  if (points.length === 0) return BASE_STROKE_WIDTH;
  const avgPressure =
    points.reduce((sum, point) => sum + (point.pressure ?? 0.5), 0) / points.length;
  return BASE_STROKE_WIDTH + avgPressure * BASE_STROKE_WIDTH * 2;
}

type SkiaInkCanvasProps = {
  onStrokesChange?: (strokes: InkStroke[]) => void;
};

export function SkiaInkCanvas({ onStrokesChange }: SkiaInkCanvasProps) {
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<InkPoint[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        const { locationX, locationY, force } = event.nativeEvent;
        setCurrentPoints([{ x: locationX, y: locationY, pressure: force, timestamp: Date.now() }]);
      },
      onPanResponderMove: (event: GestureResponderEvent) => {
        const { locationX, locationY, force } = event.nativeEvent;
        setCurrentPoints((points) => [
          ...points,
          { x: locationX, y: locationY, pressure: force, timestamp: Date.now() },
        ]);
      },
      onPanResponderRelease: () => {
        setCurrentPoints((points) => {
          if (points.length > 1) {
            const stroke = buildInkStroke(points, STROKE_COLOR, pressureToWidth(points));
            setStrokes((prev) => {
              const next = [...prev, stroke];
              onStrokesChange?.(next);
              return next;
            });
          }
          return [];
        });
      },
    }),
  ).current;

  const strokePaths = useMemo(
    () => strokes.map((stroke) => ({ stroke, path: pointsToSkPath(stroke.points) })),
    [strokes],
  );

  const currentPath = useMemo(() => pointsToSkPath(currentPoints), [currentPoints]);

  function handleClear() {
    setStrokes([]);
    onStrokesChange?.([]);
  }

  function handleUndo() {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      onStrokesChange?.(next);
      return next;
    });
  }

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas} {...panResponder.panHandlers}>
        {strokePaths.map(({ stroke, path }) => (
          <Path
            key={stroke.id}
            path={path}
            style="stroke"
            strokeWidth={stroke.width}
            strokeJoin="round"
            strokeCap="round"
            color={stroke.color}
          />
        ))}
        {currentPoints.length > 1 ? (
          <Path
            path={currentPath}
            style="stroke"
            strokeWidth={pressureToWidth(currentPoints)}
            strokeJoin="round"
            strokeCap="round"
            color={STROKE_COLOR}
          />
        ) : null}
      </Canvas>
      <View style={styles.toolbar}>
        <Pressable onPress={handleUndo} style={styles.toolbarButton}>
          <Text style={styles.toolbarButtonText}>Undo</Text>
        </Pressable>
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
