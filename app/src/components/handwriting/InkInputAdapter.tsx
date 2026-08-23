import { Platform, StyleSheet, View } from 'react-native';

import type { InkStroke } from '../../types/handwriting';
import type { InkError } from 'native-ink-view';
import { NativeInkCanvas } from './NativeInkView';
import type { EditorTool } from './SkiaInkCanvas';

export type InkInputAdapterProps = {
  pageId: string;
  enabled: boolean;
  strokes: InkStroke[];
  pageWidth: number;
  pageHeight: number;
  tool: EditorTool;
  color: string;
  width: number;
  fingerDrawing: boolean;
  onStrokesChange: (pageId: string, strokes: InkStroke[]) => boolean | void;
  onError?: (error: InkError) => void;
};

/**
 * 플랫폼 잉크 SDK가 공통 문서 포맷을 읽고 쓰는 단일 경계다.
 * iOS PencilKit과 Android Jetpack Ink가 이 컴포넌트의 동일한 props 계약을 구현한다.
 */
export const supportsNativeInkInput = Platform.OS === 'ios' || Platform.OS === 'android';

export function InkInputAdapter(props: InkInputAdapterProps) {
  if (!supportsNativeInkInput) return null;

  return (
    <View pointerEvents={props.enabled ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <NativeInkCanvas key={props.pageId} {...props} />
    </View>
  );
}
