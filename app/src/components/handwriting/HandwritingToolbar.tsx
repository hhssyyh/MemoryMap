import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadows, spacing } from '../../constants/theme';
import type { EditorTool } from './SkiaInkCanvas';

type Props = {
  tool: EditorTool;
  color: string;
  width: number;
  canUndo: boolean;
  compact: boolean;
  onToolChange: (tool: EditorTool) => void;
  onUndo: () => void;
  onOpenMore: () => void;
};

function ToolButton({
  symbol,
  label,
  active = false,
  disabled = false,
  compact,
  onPress,
}: {
  symbol: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.tool,
        compact && styles.toolCompact,
        active && styles.toolActive,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.symbol, active && styles.activeText]}>{symbol}</Text>
      {!compact ? <Text style={[styles.label, active && styles.activeText]}>{label}</Text> : null}
    </Pressable>
  );
}

/** 캔버스에서 자주 쓰는 동작만 남긴 공용 플로팅 툴바다. */
export function HandwritingToolbar({
  tool,
  color,
  width,
  canUndo,
  compact,
  onToolChange,
  onUndo,
  onOpenMore,
}: Props) {
  const currentDrawingTool = tool === 'highlighter' ? 'highlighter' : 'pen';
  const drawingLabel = currentDrawingTool === 'highlighter' ? '마커' : '펜';
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.content}>
        <ToolButton compact={compact} disabled={!canUndo} label="실행 취소" onPress={onUndo} symbol="↶" />
        <View style={styles.divider} />
        <Pressable
          accessibilityLabel={`현재 도구 ${drawingLabel}`}
          onPress={() => onToolChange(currentDrawingTool)}
          style={[
            styles.styleButton,
            compact && styles.styleButtonCompact,
            tool === currentDrawingTool && styles.toolActive,
          ]}
        >
          <View style={[styles.color, { backgroundColor: color }]} />
          <Text style={styles.width}>{compact ? drawingLabel : `${drawingLabel} ${width}px`}</Text>
        </Pressable>
        <ToolButton active={tool === 'eraser'} compact={compact} label="지우개" onPress={() => onToolChange('eraser')} symbol="◇" />
        <ToolButton compact={compact} label="더 보기" onPress={onOpenMore} symbol="•••" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 253, 249, 0.97)',
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: '96%',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    ...shadows.medium,
  },
  containerCompact: { borderRadius: 16, maxWidth: '100%' },
  content: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  tool: { alignItems: 'center', borderRadius: 12, minWidth: 52, paddingHorizontal: 8, paddingVertical: 6 },
  toolCompact: { minWidth: 34, paddingHorizontal: 4, paddingVertical: 8 },
  toolActive: { backgroundColor: colors.primarySoft },
  symbol: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 21 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 1 },
  activeText: { color: colors.primary },
  disabled: { opacity: 0.28 },
  divider: { backgroundColor: colors.border, height: 28, marginHorizontal: 3, width: 1 },
  styleButton: { alignItems: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 8 },
  styleButtonCompact: { paddingHorizontal: 6 },
  color: { borderColor: '#FFFFFF', borderRadius: 9, borderWidth: 2, height: 18, width: 18 },
  width: { color: colors.text, fontSize: 11, fontWeight: '800' },
});
