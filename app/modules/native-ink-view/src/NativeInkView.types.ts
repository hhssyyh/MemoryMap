import type { StyleProp, ViewStyle } from 'react-native';

export type InkInputMode = 'stylusOnly' | 'anyPointer';

export type InkPoint = {
  x: number;
  y: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  azimuth?: number;
  timestamp: number;
};

export type InkStroke = {
  id: string;
  points: InkPoint[];
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  opacity: number;
};

export type InkSnapshot = {
  schemaVersion: number;
  revision: number;
  pageSize: { width: number; height: number };
  strokes: InkStroke[];
};

export type InkChange = {
  baseRevision: number;
  changeId: string;
  addedStrokes: InkStroke[];
  removedStrokeIds: string[];
};

export type InkCapabilities = {
  pressure: boolean;
  tilt: boolean;
  palmRejection: boolean;
  motionPrediction: boolean;
  eraserMode: 'wholeStroke';
};

export type InkErrorCode =
  | 'invalidSnapshot'
  | 'revisionMismatch'
  | 'unsupportedInputMode'
  | 'unsupportedTool'
  | 'nativeFailure';

export type InkError = { code: InkErrorCode; message: string; recoverable: boolean };

export type NativeInkTool = 'pen' | 'highlighter' | 'eraser' | 'navigate';

export type NativeInkViewProps = {
  inputMode: InkInputMode;
  snapshot: InkSnapshot;
  selectedTool?: NativeInkTool;
  selectedColor?: string;
  selectedWidth?: number;
  onChange?: (change: InkChange) => void;
  onReady?: () => void;
  onCapabilities?: (capabilities: InkCapabilities) => void;
  onError?: (error: InkError) => void;
  style?: StyleProp<ViewStyle>;
};
