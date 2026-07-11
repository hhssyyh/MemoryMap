import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../constants/theme';
import type { DiaryEntry, DiaryPoint } from '../types/diary';
import { DiaryListItem } from './DiaryListItem';

type DiaryListModalProps = {
  point: DiaryPoint | null;
  onClose: () => void;
  onOpenDiary: (diary: DiaryEntry, location: string) => void;
};

export function DiaryListModal({ point, onClose, onOpenDiary }: DiaryListModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={point !== null}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="다이어리 목록 닫기"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.eyebrow}>PLACE DIARY</Text>
              <Text style={styles.title}>{point?.location}</Text>
              <Text style={styles.count}>{point?.diaries.length ?? 0}개의 기록</Text>
            </View>
            <Pressable
              accessibilityLabel="다이어리 목록 닫기"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <Text style={styles.closeIcon}>×</Text>
            </Pressable>
          </View>
          <FlatList
            contentContainerStyle={styles.listContent}
            data={point?.diaries ?? []}
            ItemSeparatorComponent={ItemSeparator}
            keyExtractor={(diary) => diary.id}
            renderItem={({ item }) => (
              <DiaryListItem
                diary={item}
                onPress={() => {
                  if (point) {
                    onOpenDiary(item, point.location);
                  }
                }}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(24, 35, 30, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '72%',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    marginBottom: spacing.md,
    width: 42,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 3,
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeButtonPressed: {
    opacity: 0.65,
  },
  closeIcon: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 28,
  },
  listContent: {
    paddingTop: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
});
