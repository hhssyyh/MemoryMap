import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Image as SkiaImage,
  Line,
  Path,
  Skia,
  useCanvasRef,
  useImage,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';

import { buildInkStroke } from '../../utils/handwriting';
import { getPatternPositions } from '../../utils/handwritingPaper';
import type {
  HandwritingLayer,
  ImageLayer,
  InkLayer,
  InkPoint,
  InkStroke,
  InkTool,
  PageBackground,
  StickerLayer,
} from '../../types/handwriting';

export type EditorTool = InkTool | 'eraser' | 'select' | 'navigate';

type CanvasSize = { width: number; height: number };

function pointsToSkPath(points: InkPoint[], scaleX: number, scaleY: number): SkPath {
  const path = Skia.Path.Make();
  const [first, ...rest] = points;
  if (!first) return path;
  path.moveTo(first.x * scaleX, first.y * scaleY);
  for (const point of rest) path.lineTo(point.x * scaleX, point.y * scaleY);
  return path;
}

function distanceToPoint(point: InkPoint, target: InkPoint) {
  return Math.hypot(point.x - target.x, point.y - target.y);
}

function strokeTouchesPoint(stroke: InkStroke, point: InkPoint, threshold: number) {
  return stroke.points.some((candidate) => distanceToPoint(candidate, point) <= threshold);
}

function BackgroundPattern({
  background,
  size,
  pageWidth,
  pageHeight,
}: {
  background: PageBackground;
  size: CanvasSize;
  pageWidth: number;
  pageHeight: number;
}) {
  const scaleX = size.width / pageWidth;
  const scaleY = size.height / pageHeight;
  const horizontal = useMemo(
    () => getPatternPositions(pageHeight).map((position) => position * scaleY),
    [pageHeight, scaleY],
  );
  const vertical = useMemo(
    () => getPatternPositions(pageWidth).map((position) => position * scaleX),
    [pageWidth, scaleX],
  );

  if (background.type !== 'preset') return null;
  if (background.preset === 'lined') {
    return <>{horizontal.map((y) => <Line key={y} p1={vec(0, y)} p2={vec(size.width, y)} color="#DDE5EE" strokeWidth={1} />)}</>;
  }
  if (background.preset === 'grid') {
    return <>{horizontal.map((y) => <Line key={`h-${y}`} p1={vec(0, y)} p2={vec(size.width, y)} color="#E1E7ED" strokeWidth={1} />)}{vertical.map((x) => <Line key={`v-${x}`} p1={vec(x, 0)} p2={vec(x, size.height)} color="#E1E7ED" strokeWidth={1} />)}</>;
  }
  if (background.preset === 'dot') {
    return <>{horizontal.flatMap((y) => vertical.map((x) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} color="#CDD5DD" />))}</>;
  }
  return null;
}

function BackgroundImage({ uri, size, rotation }: { uri: string; size: CanvasSize; rotation: 0 | 90 | 180 | 270 }) {
  const image = useImage(uri);
  if (!image) return null;
  const sideways = rotation === 90 || rotation === 270;
  const width = sideways ? size.height : size.width;
  const height = sideways ? size.width : size.height;
  const x = (size.width - width) / 2;
  const y = (size.height - height) / 2;
  return (
    <Group origin={vec(size.width / 2, size.height / 2)} transform={[{ rotate: (rotation * Math.PI) / 180 }]}>
      <SkiaImage image={image} x={x} y={y} width={width} height={height} fit="cover" />
    </Group>
  );
}

function InkLayerContent({ layer, scaleX, scaleY, visible }: { layer: InkLayer; scaleX: number; scaleY: number; visible: boolean }) {
  const paths = useMemo(
    () => layer.strokes.map((stroke) => ({ stroke, path: pointsToSkPath(stroke.points, scaleX, scaleY) })),
    [layer.strokes, scaleX, scaleY],
  );
  if (layer.hidden || !visible) return null;
  return <>{paths.map(({ stroke, path }) => <Path key={stroke.id} path={path} style="stroke" strokeWidth={stroke.width * ((scaleX + scaleY) / 2)} strokeJoin="round" strokeCap="round" color={stroke.color} opacity={stroke.opacity} />)}</>;
}

function ImageLayerContent({ layer, scaleX, scaleY }: { layer: ImageLayer; scaleX: number; scaleY: number }) {
  const image = useImage(layer.asset.previewUri);
  if (!image || layer.hidden) return null;
  const x = layer.transform.x * scaleX;
  const y = layer.transform.y * scaleY;
  const width = layer.width * layer.transform.scaleX * scaleX;
  const height = layer.height * layer.transform.scaleY * scaleY;
  return (
    <Group origin={vec(x + width / 2, y + height / 2)} transform={[{ rotate: (layer.transform.rotation * Math.PI) / 180 }]}>
      <SkiaImage image={image} x={x} y={y} width={width} height={height} fit="contain" />
    </Group>
  );
}

const STICKER_PATHS: Record<string, string> = {
  heart: 'M50 88 C42 80 10 59 10 32 C10 11 37 5 50 24 C63 5 90 11 90 32 C90 59 58 80 50 88 Z',
  star: 'M50 7 L61 37 L94 38 L68 58 L77 90 L50 72 L23 90 L32 58 L6 38 L39 37 Z',
  flower: 'M50 38 C35 12 10 27 27 49 C4 62 22 87 47 67 C60 94 87 78 70 53 C96 43 82 15 57 34 Z',
  pin: 'M50 5 C29 5 15 21 15 42 C15 65 50 94 50 94 C50 94 85 65 85 42 C85 21 71 5 50 5 Z M50 29 A13 13 0 1 1 49.9 29 Z',
};

const STICKER_COLORS: Record<string, string> = {
  heart: '#E8788E',
  star: '#F1B84B',
  flower: '#A986C8',
  pin: '#6C9BCF',
};

function StickerLayerContent({ layer, scaleX, scaleY }: { layer: StickerLayer; scaleX: number; scaleY: number }) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(STICKER_PATHS[layer.stickerId] ?? STICKER_PATHS.star!), [layer.stickerId]);
  if (!path || layer.hidden) return null;
  const width = layer.width * layer.transform.scaleX * scaleX;
  const height = layer.height * layer.transform.scaleY * scaleY;
  const x = layer.transform.x * scaleX;
  const y = layer.transform.y * scaleY;
  return (
    <Group
      transform={[
        { translateX: x + width / 2 },
        { translateY: y + height / 2 },
        { rotate: (layer.transform.rotation * Math.PI) / 180 },
        { scaleX: width / 100 },
        { scaleY: height / 100 },
        { translateX: -50 },
        { translateY: -50 },
      ]}
    >
      <Path path={path} color={STICKER_COLORS[layer.stickerId] ?? '#E8788E'} />
    </Group>
  );
}

function LayerContent({ layer, scaleX, scaleY, inkVisible }: { layer: HandwritingLayer; scaleX: number; scaleY: number; inkVisible: boolean }) {
  if (layer.type === 'ink') return <InkLayerContent layer={layer} scaleX={scaleX} scaleY={scaleY} visible={inkVisible} />;
  if (layer.type === 'image') return <ImageLayerContent layer={layer} scaleX={scaleX} scaleY={scaleY} />;
  return <StickerLayerContent layer={layer} scaleX={scaleX} scaleY={scaleY} />;
}

type SkiaInkCanvasProps = {
  strokes: InkStroke[];
  layers: HandwritingLayer[];
  pageWidth: number;
  pageHeight: number;
  background: PageBackground;
  tool: EditorTool;
  color: string;
  width: number;
  onStrokesChange: (strokes: InkStroke[]) => void;
  renderInk?: boolean;
};

export type SkiaInkCanvasHandle = {
  makePngSnapshot: () => Promise<Uint8Array | null>;
};

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export const SkiaInkCanvas = forwardRef<SkiaInkCanvasHandle, SkiaInkCanvasProps>(function SkiaInkCanvas({
  strokes,
  layers,
  pageWidth,
  pageHeight,
  background,
  tool,
  color,
  width,
  onStrokesChange,
  renderInk = true,
}, forwardedRef) {
  const [currentPoints, setCurrentPoints] = useState<InkPoint[]>([]);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 1, height: 1 });
  const [snapshotMode, setSnapshotMode] = useState(false);
  const erasedStrokeIds = useRef(new Set<string>());
  const canvasRef = useCanvasRef();

  useImperativeHandle(forwardedRef, () => ({
    async makePngSnapshot() {
      setSnapshotMode(true);
      try {
        await nextFrame();
        await nextFrame();
        const image = await canvasRef.current?.makeImageSnapshotAsync();
        return image?.encodeToBytes() ?? null;
      } finally {
        setSnapshotMode(false);
      }
    },
  }), [canvasRef]);

  const toPagePoint = (event: GestureResponderEvent): InkPoint => ({
    x: (event.nativeEvent.locationX / canvasSize.width) * pageWidth,
    y: (event.nativeEvent.locationY / canvasSize.height) * pageHeight,
    pressure: event.nativeEvent.force,
    timestamp: Date.now(),
  });

  const recordEraserHit = (point: InkPoint) => {
    const threshold = Math.max(12, width * 2);
    for (const stroke of strokes) {
      if (strokeTouchesPoint(stroke, point, threshold)) erasedStrokeIds.current.add(stroke.id);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => tool === 'pen' || tool === 'highlighter' || tool === 'eraser',
    onMoveShouldSetPanResponder: () => tool === 'pen' || tool === 'highlighter' || tool === 'eraser',
    onPanResponderGrant: (event) => {
      const point = toPagePoint(event);
      if (tool === 'eraser') {
        erasedStrokeIds.current.clear();
        recordEraserHit(point);
      } else {
        setCurrentPoints([point]);
      }
    },
    onPanResponderMove: (event) => {
      const point = toPagePoint(event);
      if (tool === 'eraser') recordEraserHit(point);
      else setCurrentPoints((points) => [...points, point]);
    },
    onPanResponderRelease: () => {
      if (tool === 'eraser') {
        if (erasedStrokeIds.current.size > 0) {
          onStrokesChange(strokes.filter((stroke) => !erasedStrokeIds.current.has(stroke.id)));
        }
        erasedStrokeIds.current.clear();
        return;
      }
      setCurrentPoints((points) => {
        if (points.length > 1 && (tool === 'pen' || tool === 'highlighter')) {
          onStrokesChange([...strokes, buildInkStroke(points, color, width, tool)]);
        }
        return [];
      });
    },
    onPanResponderTerminate: () => {
      erasedStrokeIds.current.clear();
      setCurrentPoints([]);
    },
  });

  const scaleX = canvasSize.width / pageWidth;
  const scaleY = canvasSize.height / pageHeight;
  const currentPath = useMemo(
    () => pointsToSkPath(currentPoints, scaleX, scaleY),
    [currentPoints, scaleX, scaleY],
  );

  function handleLayout(event: LayoutChangeEvent) {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setCanvasSize({ width: Math.max(1, nextWidth), height: Math.max(1, nextHeight) });
  }

  const backgroundColor =
    background.type === 'preset' && background.preset === 'cream' ? '#FFF7E3' : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor }]} onLayout={handleLayout}>
      <Canvas ref={canvasRef} style={styles.canvas} {...panResponder.panHandlers}>
        {background.type === 'image' ? <BackgroundImage uri={background.asset.previewUri} rotation={background.rotation} size={canvasSize} /> : null}
        <BackgroundPattern
          background={background}
          size={canvasSize}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
        />
        {layers.filter((layer) => layer.type !== 'ink').map((layer) => (
          <LayerContent
            key={layer.id}
            layer={layer}
            scaleX={scaleX}
            scaleY={scaleY}
            inkVisible={renderInk || snapshotMode}
          />
        ))}
        {layers.filter((layer) => layer.type === 'ink').map((layer) => (
          <LayerContent
            key={layer.id}
            layer={layer}
            scaleX={scaleX}
            scaleY={scaleY}
            inkVisible={renderInk || snapshotMode}
          />
        ))}
        {currentPoints.length > 1 ? (
          <Path
            path={currentPath}
            style="stroke"
            strokeWidth={width * ((scaleX + scaleY) / 2)}
            strokeJoin="round"
            strokeCap="round"
            color={color}
            opacity={tool === 'highlighter' ? 0.35 : 1}
          />
        ) : null}
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1 },
});
