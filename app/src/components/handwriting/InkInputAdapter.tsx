import { Platform, StyleSheet, View } from 'react-native';

import type { InkStroke } from '../../types/handwriting';
import { NativeInkCanvas } from './NativeInkView';
import type { EditorTool } from './SkiaInkCanvas';

export type InkInputAdapterProps = {
  strokes: InkStroke[];
  pageWidth: number;
  pageHeight: number;
  tool: EditorTool;
  color: string;
  width: number;
  fingerDrawing: boolean;
  onStrokesChange: (strokes: InkStroke[]) => void;
};

/**
 * 플랫폼 잉크 SDK가 공통 문서 포맷을 읽고 쓰는 단일 경계다.
 * Android Jetpack Ink 어댑터는 이 컴포넌트의 props 계약을 그대로 구현하면 된다.
 */
export const supportsNativeInkInput = Platform.OS === 'ios';

export function InkInputAdapter(props: InkInputAdapterProps) {
  if (!supportsNativeInkInput) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <NativeInkCanvas {...props} />
    </View>
  );
}
