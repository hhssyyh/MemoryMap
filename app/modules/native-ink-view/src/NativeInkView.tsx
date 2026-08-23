import { requireNativeView } from 'expo';
import * as React from 'react';

import type { NativeInkViewProps } from './NativeInkView.types';

const NativeView: React.ComponentType<NativeInkViewProps> = requireNativeView('NativeInkView');

export default function NativeInkView(props: NativeInkViewProps) {
  return <NativeView {...props} />;
}
