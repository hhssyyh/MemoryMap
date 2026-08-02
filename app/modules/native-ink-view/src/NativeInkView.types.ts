import type { StyleProp, ViewStyle } from 'react-native';

export type NativeInkPointPayload = {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
};

export type NativeInkStrokePayload = {
  id: string;
  points: NativeInkPointPayload[];
  color: string;
  width: number;
};

export type NativeInkViewProps = {
  drawingPolicy?: 'anyInput' | 'pencilOnly';
  clearTrigger?: number;
  onDrawingChange?: (event: { nativeEvent: { strokes: NativeInkStrokePayload[] } }) => void;
  style?: StyleProp<ViewStyle>;
};
