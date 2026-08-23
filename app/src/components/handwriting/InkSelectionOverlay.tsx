import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';

import type { InkStroke } from '../../types/handwriting';
import {
  getInkStrokeBounds,
  selectInkStrokeIds,
} from '../../utils/handwritingInkSelection';

type ScreenPoint = { x: number; y: number };

function makePath(points: ScreenPoint[], close = false) {
  const path = Skia.Path.Make();
  const first = points[0];
  if (!first) return path;
  path.moveTo(first.x, first.y);
  points.slice(1).forEach((point) => path.lineTo(point.x, point.y));
  if (close) path.close();
  return path;
}

export function InkSelectionOverlay({
  strokes,
  pageWidth,
  pageHeight,
  renderedWidth,
  renderedHeight,
  onMove,
}: {
  strokes: InkStroke[];
  pageWidth: number;
  pageHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  onMove: (selectedIds: ReadonlySet<string>, delta: { x: number; y: number }) => void;
}) {
  const [lasso, setLasso] = useState<ScreenPoint[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewDelta, setPreviewDelta] = useState<ScreenPoint>({ x: 0, y: 0 });
  const lassoRef = useRef(lasso);
  const selectedRef = useRef(selectedIds);
  const mode = useRef<'lasso' | 'move'>('lasso');
  lassoRef.current = lasso;
  selectedRef.current = selectedIds;

  const scaleX = renderedWidth / pageWidth;
  const scaleY = renderedHeight / pageHeight;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const logicalBounds = getInkStrokeBounds(strokes, selectedSet);
  const screenBounds = logicalBounds ? {
    left: logicalBounds.minX * scaleX,
    top: logicalBounds.minY * scaleY,
    width: Math.max(1, (logicalBounds.maxX - logicalBounds.minX) * scaleX),
    height: Math.max(1, (logicalBounds.maxY - logicalBounds.minY) * scaleY),
  } : null;

  const selectedPaths = useMemo(() => strokes
    .filter((stroke) => selectedSet.has(stroke.id))
    .map((stroke) => ({
      stroke,
      path: makePath(stroke.points.map((point) => ({ x: point.x * scaleX, y: point.y * scaleY }))),
    })), [scaleX, scaleY, selectedSet, strokes]);
  const lassoPath = useMemo(() => makePath(lasso, lasso.length > 2), [lasso]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      const bounds = screenBounds;
      const insideSelection = bounds &&
        point.x >= bounds.left - 16 && point.x <= bounds.left + bounds.width + 16 &&
        point.y >= bounds.top - 16 && point.y <= bounds.top + bounds.height + 16;
      mode.current = insideSelection ? 'move' : 'lasso';
      setPreviewDelta({ x: 0, y: 0 });
      if (!insideSelection) {
        selectedRef.current = [];
        setSelectedIds([]);
        lassoRef.current = [point];
        setLasso([point]);
      }
    },
    onPanResponderMove: (event, gesture) => {
      if (mode.current === 'move') {
        setPreviewDelta({ x: gesture.dx, y: gesture.dy });
      } else {
        const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
        lassoRef.current = [...lassoRef.current, point];
        setLasso(lassoRef.current);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (mode.current === 'move' && selectedRef.current.length > 0) {
        onMove(new Set(selectedRef.current), {
          x: gesture.dx / Math.max(scaleX, 0.0001),
          y: gesture.dy / Math.max(scaleY, 0.0001),
        });
      } else {
        const polygon = lassoRef.current.map((point) => ({
          x: point.x / Math.max(scaleX, 0.0001),
          y: point.y / Math.max(scaleY, 0.0001),
        }));
        const ids = selectInkStrokeIds(strokes, polygon);
        selectedRef.current = ids;
        setSelectedIds(ids);
      }
      lassoRef.current = [];
      setLasso([]);
      setPreviewDelta({ x: 0, y: 0 });
    },
    onPanResponderTerminate: () => {
      lassoRef.current = [];
      setLasso([]);
      setPreviewDelta({ x: 0, y: 0 });
    },
  }), [onMove, scaleX, scaleY, screenBounds, strokes]);

  return (
    <View {...responder.panHandlers} style={StyleSheet.absoluteFill}>
      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        {lasso.length > 1 ? (
          <Path color="#D96D85" path={lassoPath} style="stroke" strokeWidth={2} />
        ) : null}
        <Group transform={[{ translateX: previewDelta.x }, { translateY: previewDelta.y }]}>
          {previewDelta.x !== 0 || previewDelta.y !== 0 ? selectedPaths.map(({ stroke, path }) => (
            <Path
              color={stroke.color}
              key={stroke.id}
              opacity={0.72}
              path={path}
              strokeCap="round"
              strokeJoin="round"
              strokeWidth={Math.max(2, stroke.width * ((scaleX + scaleY) / 2))}
              style="stroke"
            />
          )) : null}
        </Group>
      </Canvas>
      {screenBounds ? (
        <View
          pointerEvents="none"
          style={[
            styles.selection,
            {
              height: screenBounds.height,
              left: screenBounds.left + previewDelta.x,
              top: screenBounds.top + previewDelta.y,
              width: screenBounds.width,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  selection: {
    borderColor: '#D96D85',
    borderRadius: 4,
    borderStyle: 'dashed',
    borderWidth: 2,
    position: 'absolute',
  },
});
