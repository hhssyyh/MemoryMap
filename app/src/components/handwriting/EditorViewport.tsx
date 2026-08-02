import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

type ViewportTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

function touchDistance(touches: ReadonlyArray<{ pageX: number; pageY: number }>) {
  const [first, second] = touches;
  if (!first || !second) return 0;
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

function touchAngle(touches: ReadonlyArray<{ pageX: number; pageY: number }>) {
  const [first, second] = touches;
  if (!first || !second) return 0;
  return Math.atan2(second.pageY - first.pageY, second.pageX - first.pageX);
}

export function EditorViewport({
  navigationEnabled,
  fingerNavigationOnly = false,
  children,
}: {
  navigationEnabled: boolean;
  fingerNavigationOnly?: boolean;
  children: ReactNode;
}) {
  const [transform, setTransform] = useState<ViewportTransform>({ x: 0, y: 0, scale: 1, rotation: 0 });
  const start = useRef(transform);
  const pinchStart = useRef<{ distance: number; angle: number } | null>(null);

  const shouldHandleTouches = useCallback(
    (touches: ReadonlyArray<{ force?: number }>) => {
      if (!navigationEnabled || touches.length === 0) return false;
      if (touches.length > 1 || !fingerNavigationOnly) return true;
      // iPad에는 3D Touch가 없으므로 손가락 force는 보통 0이고 Pencil은 압력을 전달한다.
      // 이 구분으로 PencilKit 필기는 자식 뷰에 남기면서 한 손가락 이동만 부모가 담당한다.
      return (touches[0]?.force ?? 0) <= 0.01;
    },
    [fingerNavigationOnly, navigationEnabled],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => shouldHandleTouches(event.nativeEvent.touches),
        onMoveShouldSetPanResponder: (event, gesture) =>
          shouldHandleTouches(event.nativeEvent.touches) &&
          (event.nativeEvent.touches.length > 1 || Math.abs(gesture.dx) + Math.abs(gesture.dy) > 4),
        onPanResponderGrant: (event) => {
          start.current = transform;
          const touches = event.nativeEvent.touches;
          pinchStart.current =
            touches.length > 1
              ? { distance: touchDistance(touches), angle: touchAngle(touches) }
              : null;
        },
        onPanResponderMove: (event, gesture) => {
          const touches = event.nativeEvent.touches;
          if (touches.length > 1) {
            pinchStart.current ??= {
              distance: touchDistance(touches),
              angle: touchAngle(touches),
            };
            const initial = pinchStart.current;
            const distance = touchDistance(touches);
            const angle = touchAngle(touches);
            setTransform({
              x: start.current.x + gesture.dx,
              y: start.current.y + gesture.dy,
              scale: Math.max(0.5, Math.min(4, start.current.scale * (distance / Math.max(1, initial.distance)))),
              rotation: start.current.rotation + ((angle - initial.angle) * 180) / Math.PI,
            });
          } else {
            setTransform((current) => ({
              ...current,
              x: start.current.x + gesture.dx,
              y: start.current.y + gesture.dy,
            }));
          }
        },
        onPanResponderRelease: () => {
          pinchStart.current = null;
        },
        onPanResponderTerminate: () => {
          pinchStart.current = null;
        },
      }),
    [shouldHandleTouches, transform],
  );

  return (
    <View style={styles.viewport} {...responder.panHandlers}>
      <View
        style={[
          styles.content,
          {
            transform: [
            { translateX: transform.x },
            { translateY: transform.y },
            { scale: transform.scale },
            { rotate: `${transform.rotation}deg` },
            ],
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function LayerDragOverlay({
  layer,
  pageWidth,
  pageHeight,
  renderedWidth,
  renderedHeight,
  onMove,
}: {
  layer: { width: number; height: number; transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number } };
  pageWidth: number;
  pageHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  onMove: (deltaX: number, deltaY: number) => void;
}) {
  const [preview, setPreview] = useState({ x: 0, y: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => setPreview({ x: gesture.dx, y: gesture.dy }),
        onPanResponderRelease: (_, gesture) => {
          setPreview({ x: 0, y: 0 });
          onMove(
            (gesture.dx / Math.max(1, renderedWidth)) * pageWidth,
            (gesture.dy / Math.max(1, renderedHeight)) * pageHeight,
          );
        },
        onPanResponderTerminate: () => setPreview({ x: 0, y: 0 }),
      }),
    [onMove, pageHeight, pageWidth, renderedHeight, renderedWidth],
  );

  const scaleX = renderedWidth / pageWidth;
  const scaleY = renderedHeight / pageHeight;
  return (
    <View
      {...responder.panHandlers}
      style={[
        styles.layerSelection,
        {
          left: layer.transform.x * scaleX,
          top: layer.transform.y * scaleY,
          width: layer.width * layer.transform.scaleX * scaleX,
          height: layer.height * layer.transform.scaleY * scaleY,
          transform: [
            { translateX: preview.x },
            { translateY: preview.y },
            { rotate: `${layer.transform.rotation}deg` },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  viewport: { alignItems: 'center', flex: 1, justifyContent: 'center', overflow: 'hidden' },
  content: { alignItems: 'center', height: '100%', justifyContent: 'center', width: '100%' },
  layerSelection: { borderColor: '#E79BAA', borderRadius: 4, borderStyle: 'dashed', borderWidth: 2, position: 'absolute' },
});
