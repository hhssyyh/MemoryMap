import type { StyleProp, ViewStyle } from 'react-native';

export type NativeInkPointPayload = {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  azimuth?: number;
  timestamp: number;
};

export type NativeInkStrokePayload = {
  id: string;
  points: NativeInkPointPayload[];
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  opacity: number;
};

export type NativeInkViewProps = {
  drawingPolicy?: 'anyInput' | 'pencilOnly';
  strokesJson?: string;
  selectedTool?: 'pen' | 'highlighter' | 'eraser' | 'navigate';
  selectedColor?: string;
  selectedWidth?: number;
  pageWidth?: number;
  pageHeight?: number;
  clearTrigger?: number;
  onDrawingChange?: (event: { nativeEvent: { strokes: NativeInkStrokePayload[] } }) => void;
  style?: StyleProp<ViewStyle>;
};
