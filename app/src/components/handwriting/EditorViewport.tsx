import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  type PointerEvent as NativePointerEventEvent,
  StyleSheet,
  View,
} from 'react-native';

import type { LayerTransform } from '../../types/handwriting';
import {
  resizeLayerFromCorner,
  rotationDeltaDegrees,
  screenDeltaToPageDelta,
  viewportTransformFromPointers,
  type ResizeCorner,
} from '../../utils/handwritingGestures';

const RESIZE_CORNERS: ResizeCorner[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
const HANDLE_PADDING = 44;

type ViewportTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type ViewportInteractionContextValue = ViewportTransform & {
  beginLayerInteraction: () => void;
  endLayerInteraction: () => void;
};

const ViewportTransformContext = createContext<ViewportInteractionContextValue>({
  x: 0, y: 0, scale: 1, rotation: 0,
  beginLayerInteraction: () => undefined,
  endLayerInteraction: () => undefined,
});

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
  deferSingleTouch = false,
  resetKey = 0,
  children,
}: {
  navigationEnabled: boolean;
  fingerNavigationOnly?: boolean;
  deferSingleTouch?: boolean;
  resetKey?: number;
  children: ReactNode;
}) {
  const [transform, setTransform] = useState<ViewportTransform>({ x: 0, y: 0, scale: 1, rotation: 0 });
  const transformRef = useRef(transform);
  const start = useRef(transform);
  const pinchStart = useRef<{ distance: number; angle: number } | null>(null);
  const navigationPointers = useRef(new Map<number, { x: number; y: number }>());
  const pointerGestureStart = useRef<{
    transform: ViewportTransform;
    pointers: Array<{ id: number; x: number; y: number }>;
  } | null>(null);
  const layerInteractionCount = useRef(0);
  transformRef.current = transform;

  useEffect(() => {
    const reset = { x: 0, y: 0, scale: 1, rotation: 0 };
    transformRef.current = reset;
    start.current = reset;
    navigationPointers.current.clear();
    pointerGestureStart.current = null;
    setTransform(reset);
  }, [resetKey]);

  const shouldHandleTouches = useCallback(
    (touches: ReadonlyArray<{ force?: number }>) => {
      if (!navigationEnabled || layerInteractionCount.current > 0 || touches.length === 0) return false;
      // Native ink mode uses W3C pointer events below so pointerType, rather
      // than pressure, separates touch navigation from stylus drawing.
      if (fingerNavigationOnly) return false;
      return true;
    },
    [fingerNavigationOnly, navigationEnabled],
  );

  const resetPointerGesture = useCallback(() => {
    pointerGestureStart.current = navigationPointers.current.size === 0
      ? null
      : {
          transform: transformRef.current,
          pointers: [...navigationPointers.current.entries()].slice(0, 2).map(
            ([id, point]) => ({ id, ...point }),
          ),
        };
  }, []);

  const handlePointerDown = useCallback((event: NativePointerEventEvent) => {
    if (
      !navigationEnabled ||
      !fingerNavigationOnly ||
      layerInteractionCount.current > 0 ||
      event.nativeEvent.pointerType !== 'touch'
    ) return;
    navigationPointers.current.set(event.nativeEvent.pointerId, {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
    resetPointerGesture();
  }, [fingerNavigationOnly, navigationEnabled, resetPointerGesture]);

  const handlePointerMove = useCallback((event: NativePointerEventEvent) => {
    if (!fingerNavigationOnly || event.nativeEvent.pointerType !== 'touch') return;
    if (!navigationPointers.current.has(event.nativeEvent.pointerId)) return;
    navigationPointers.current.set(event.nativeEvent.pointerId, {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
    const gesture = pointerGestureStart.current;
    if (!gesture) return;
    const current = gesture.pointers.flatMap(({ id }) => {
      const point = navigationPointers.current.get(id);
      return point ? [point] : [];
    });
    if (current.length !== gesture.pointers.length) return;
    const next = viewportTransformFromPointers(
      gesture.transform,
      gesture.pointers,
      current,
    );
    transformRef.current = next;
    setTransform(next);
  }, [fingerNavigationOnly]);

  const handlePointerEnd = useCallback((event: NativePointerEventEvent) => {
    if (event.nativeEvent.pointerType !== 'touch') return;
    navigationPointers.current.delete(event.nativeEvent.pointerId);
    resetPointerGesture();
  }, [resetPointerGesture]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) =>
          shouldHandleTouches(event.nativeEvent.touches) &&
          (!deferSingleTouch || event.nativeEvent.touches.length > 1),
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
    [deferSingleTouch, shouldHandleTouches, transform],
  );

  const interactionContext = useMemo<ViewportInteractionContextValue>(() => ({
    ...transform,
    beginLayerInteraction: () => { layerInteractionCount.current += 1; },
    endLayerInteraction: () => {
      layerInteractionCount.current = Math.max(0, layerInteractionCount.current - 1);
    },
  }), [transform]);

  return (
    <View
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      style={styles.viewport}
      {...responder.panHandlers}
    >
      <ViewportTransformContext.Provider value={interactionContext}>
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
      </ViewportTransformContext.Provider>
    </View>
  );
}

export function LayerTransformOverlay({
  layer,
  pageWidth,
  pageHeight,
  renderedWidth,
  renderedHeight,
  onCommit,
}: {
  layer: { width: number; height: number; transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number } };
  pageWidth: number;
  pageHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  onCommit: (transform: LayerTransform) => void;
}) {
  const [preview, setPreview] = useState(layer.transform);
  const viewport = useContext(ViewportTransformContext);
  const previewRef = useRef(preview);
  const start = useRef(layer.transform);
  const pinchStart = useRef<{ distance: number; angle: number } | null>(null);
  const selectionRef = useRef<View>(null);
  const rotationGesture = useRef<{
    center: { x: number; y: number };
    pointer: { x: number; y: number };
    rotation: number;
  } | null>(null);
  const updatePreview = useCallback((next: LayerTransform) => {
    previewRef.current = next;
    setPreview(next);
  }, []);
  useEffect(() => {
    previewRef.current = layer.transform;
    setPreview(layer.transform);
  }, [layer.transform]);

  const toPageX = pageWidth / Math.max(1, renderedWidth);
  const toPageY = pageHeight / Math.max(1, renderedHeight);
  const toPageDelta = useCallback(
    (x: number, y: number) => screenDeltaToPageDelta(
      { x, y },
      viewport,
      { x: toPageX, y: toPageY },
    ),
    [toPageX, toPageY, viewport],
  );
  const commitIfChanged = useCallback((candidate: LayerTransform) => {
    const original = layer.transform;
    if (
      candidate.x !== original.x ||
      candidate.y !== original.y ||
      candidate.scaleX !== original.scaleX ||
      candidate.scaleY !== original.scaleY ||
      candidate.rotation !== original.rotation
    ) onCommit(candidate);
  }, [layer.transform, onCommit]);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          viewport.beginLayerInteraction();
          start.current = layer.transform;
          const touches = event.nativeEvent.touches;
          pinchStart.current = touches.length > 1
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
            const factor = touchDistance(touches) / Math.max(1, initial.distance);
            const delta = toPageDelta(gesture.dx, gesture.dy);
            updatePreview({
              ...start.current,
              x: start.current.x + delta.x,
              y: start.current.y + delta.y,
              scaleX: Math.max(0.1, Math.min(6, start.current.scaleX * factor)),
              scaleY: Math.max(0.1, Math.min(6, start.current.scaleY * factor)),
              rotation:
                start.current.rotation +
                ((touchAngle(touches) - initial.angle) * 180) / Math.PI,
            });
          } else {
            const delta = toPageDelta(gesture.dx, gesture.dy);
            updatePreview({
              ...start.current,
              x: start.current.x + delta.x,
              y: start.current.y + delta.y,
            });
          }
        },
        onPanResponderRelease: () => {
          pinchStart.current = null;
          commitIfChanged(previewRef.current);
          viewport.endLayerInteraction();
        },
        onPanResponderTerminate: () => {
          pinchStart.current = null;
          updatePreview(layer.transform);
          viewport.endLayerInteraction();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [commitIfChanged, layer.transform, toPageDelta, updatePreview, viewport],
  );

  const resizeResponders = useMemo(
    () => Object.fromEntries(RESIZE_CORNERS.map((corner) => [corner, PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          viewport.beginLayerInteraction();
          start.current = previewRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const delta = toPageDelta(gesture.dx, gesture.dy);
          updatePreview(resizeLayerFromCorner(start.current, layer, delta, corner));
        },
        onPanResponderRelease: () => {
          commitIfChanged(previewRef.current);
          viewport.endLayerInteraction();
        },
        onPanResponderTerminate: () => {
          updatePreview(layer.transform);
          viewport.endLayerInteraction();
        },
        onPanResponderTerminationRequest: () => false,
      })])) as Record<ResizeCorner, ReturnType<typeof PanResponder.create>>,
    [commitIfChanged, layer.height, layer.transform, layer.width, toPageDelta, updatePreview, viewport],
  );

  const rotationResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        viewport.beginLayerInteraction();
        start.current = previewRef.current;
        rotationGesture.current = null;
        const touch = event.nativeEvent.touches[0] ?? event.nativeEvent.changedTouches[0];
        if (!touch) return;
        const pointer = { x: touch.pageX, y: touch.pageY };
        const rotation = start.current.rotation;
        selectionRef.current?.measureInWindow((x, y, width, height) => {
          rotationGesture.current = {
            center: { x: x + width / 2, y: y + height / 2 },
            pointer,
            rotation,
          };
        });
      },
      onPanResponderMove: (event) => {
        const gesture = rotationGesture.current;
        const touch = event.nativeEvent.touches[0] ?? event.nativeEvent.changedTouches[0];
        if (!gesture || !touch) return;
        updatePreview({
          ...start.current,
          rotation: gesture.rotation + rotationDeltaDegrees(
            gesture.center,
            gesture.pointer,
            { x: touch.pageX, y: touch.pageY },
          ),
        });
      },
      onPanResponderRelease: () => {
        rotationGesture.current = null;
        commitIfChanged(previewRef.current);
        viewport.endLayerInteraction();
      },
      onPanResponderTerminate: () => {
        rotationGesture.current = null;
        updatePreview(layer.transform);
        viewport.endLayerInteraction();
      },
      onPanResponderTerminationRequest: () => false,
    }),
    [commitIfChanged, layer.transform, updatePreview, viewport],
  );

  const scaleX = renderedWidth / pageWidth;
  const scaleY = renderedHeight / pageHeight;
  const selectionWidth = layer.width * preview.scaleX * scaleX;
  const selectionHeight = layer.height * preview.scaleY * scaleY;
  return (
    <View
      collapsable={false}
      pointerEvents="box-none"
      ref={selectionRef}
      style={[
        styles.layerSelectionBounds,
        {
          left: preview.x * scaleX - HANDLE_PADDING,
          top: preview.y * scaleY - HANDLE_PADDING,
          width: selectionWidth + HANDLE_PADDING * 2,
          height: selectionHeight + HANDLE_PADDING * 2,
          transform: [
            { rotate: `${preview.rotation}deg` },
          ],
        },
      ]}
    >
      <View
        {...responder.panHandlers}
        style={[
          styles.layerSelection,
          {
            height: selectionHeight,
            left: HANDLE_PADDING,
            top: HANDLE_PADDING,
            width: selectionWidth,
          },
        ]}
      />
      <View hitSlop={13} {...rotationResponder.panHandlers} style={[styles.handle, styles.rotationHandle]} />
      {RESIZE_CORNERS.map((corner) => (
        <View
          {...resizeResponders[corner].panHandlers}
          hitSlop={13}
          key={corner}
          style={[styles.handle, styles[`${corner}Handle`]]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { alignItems: 'center', flex: 1, justifyContent: 'center', overflow: 'hidden' },
  content: { alignItems: 'center', height: '100%', justifyContent: 'center', width: '100%' },
  layerSelectionBounds: { position: 'absolute', zIndex: 4 },
  layerSelection: { borderColor: '#E79BAA', borderRadius: 4, borderStyle: 'dashed', borderWidth: 2, position: 'absolute' },
  handle: { backgroundColor: '#FFFFFF', borderColor: '#D96D85', borderRadius: 9, borderWidth: 2, height: 18, position: 'absolute', width: 18, zIndex: 2 },
  topLeftHandle: { left: HANDLE_PADDING - 10, top: HANDLE_PADDING - 10 },
  topRightHandle: { right: HANDLE_PADDING - 10, top: HANDLE_PADDING - 10 },
  bottomLeftHandle: { bottom: HANDLE_PADDING - 10, left: HANDLE_PADDING - 10 },
  bottomRightHandle: { bottom: HANDLE_PADDING - 10, right: HANDLE_PADDING - 10 },
  rotationHandle: { left: '50%', marginLeft: -9, top: HANDLE_PADDING - 34, zIndex: 3 },
});
