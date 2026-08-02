import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../constants/theme';
import { NativeInkCanvas } from '../components/handwriting/NativeInkView';
import { SkiaInkCanvas } from '../components/handwriting/SkiaInkCanvas';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { HandwritingEngine, InkStroke } from '../types/handwriting';
import { getHandwritingNote, saveHandwritingNote } from '../utils/handwriting';
import { isTablet } from '../utils/isTablet';

type Props = NativeStackScreenProps<RootStackParamList, 'HandwritingPrototype'>;

const ENGINE_LABELS: Record<HandwritingEngine, string> = {
  skia: 'Canvas (JS)',
  native: 'Native',
};

export function HandwritingPrototypeScreen({ navigation, route }: Props) {
  const { diary } = route.params;
  const insets = useSafeAreaInsets();
  const existingNote = getHandwritingNote(diary.id);
  const [engine, setEngine] = useState<HandwritingEngine>(existingNote?.engine ?? 'skia');
  const [strokes, setStrokes] = useState<InkStroke[]>(existingNote?.strokes ?? []);

  if (!isTablet()) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.missing}>이 기능은 태블릿에서만 지원됩니다.</Text>
        <Pressable onPress={navigation.goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  function handleSave() {
    saveHandwritingNote(diary.id, { engine, strokes });
    navigation.goBack();
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack}>
          <Text style={styles.cancel}>취소</Text>
        </Pressable>
        <Text style={styles.headerTitle}>손글씨 프로토타입</Text>
        <Pressable onPress={handleSave}>
          <Text style={styles.save}>저장</Text>
        </Pressable>
      </View>

      <View style={styles.preview}>
        {diary.photoUri ? <Image source={{ uri: diary.photoUri }} style={styles.previewPhoto} /> : null}
        <View style={styles.previewText}>
          <Text style={styles.previewTitle}>{diary.title}</Text>
          <Text style={styles.previewDate}>{diary.date}</Text>
        </View>
      </View>

      <View style={styles.toggle}>
        {(Object.keys(ENGINE_LABELS) as HandwritingEngine[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setEngine(key)}
            style={[styles.toggleButton, engine === key && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleButtonText, engine === key && styles.toggleButtonTextActive]}>
              {ENGINE_LABELS[key]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.canvasArea}>
        {engine === 'skia' ? (
          <SkiaInkCanvas onStrokesChange={setStrokes} />
        ) : (
          <NativeInkCanvas onStrokesChange={setStrokes} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  missing: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  cancel: {
    color: colors.textMuted,
    fontSize: 15,
  },
  save: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  preview: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  previewPhoto: {
    borderRadius: 10,
    height: 56,
    width: 56,
  },
  previewText: {
    flex: 1,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  previewDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  toggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  toggleButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: colors.surface,
  },
  canvasArea: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
