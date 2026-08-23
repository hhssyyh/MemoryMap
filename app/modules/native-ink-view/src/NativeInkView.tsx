import { requireNativeView } from 'expo';
import * as React from 'react';

import type {
  InkCapabilities,
  InkChange,
  InkError,
  NativeInkViewProps,
} from './NativeInkView.types';

type InternalNativeInkViewProps = Omit<
  NativeInkViewProps,
  'snapshot' | 'inputMode' | 'onChange' | 'onReady' | 'onCapabilities' | 'onError'
> & {
  inputMode: NativeInkViewProps['inputMode'];
  snapshotJson: string;
  onInkChange?: (event: { nativeEvent: InkChange }) => void;
  onReady?: (event: { nativeEvent: Record<string, never> }) => void;
  onCapabilities?: (event: { nativeEvent: InkCapabilities }) => void;
  onError?: (event: { nativeEvent: InkError }) => void;
};

const NativeView: React.ComponentType<InternalNativeInkViewProps> =
  requireNativeView('NativeInkView');

export default function NativeInkView({
  snapshot,
  onChange,
  onReady,
  onCapabilities,
  onError,
  ...props
}: NativeInkViewProps) {
  const snapshotJson = React.useMemo(() => JSON.stringify(snapshot), [snapshot]);
  return (
    <NativeView
      {...props}
      snapshotJson={snapshotJson}
      onInkChange={(event) => onChange?.(event.nativeEvent)}
      onReady={() => onReady?.()}
      onCapabilities={(event) => onCapabilities?.(event.nativeEvent)}
      onError={(event) => onError?.(event.nativeEvent)}
    />
  );
}
