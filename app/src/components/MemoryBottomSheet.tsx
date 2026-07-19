import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import type { DiaryEntry, DiaryPoint } from '../types/diary';
import { DiaryListItem } from './DiaryListItem';
import { ThemedText as Text } from './ThemedText';

type MemoryBottomSheetProps = {
  point: DiaryPoint | null;
  onClose: () => void;
  onOpenDiary: (diary: DiaryEntry, location: string) => void;
};

export function MemoryBottomSheet({ point, onClose, onOpenDiary }: MemoryBottomSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(460)).current;

  useEffect(() => {
    if (!point) return;

    translateY.setValue(460);
    Animated.spring(translateY, {
      damping: 24,
      mass: 0.9,
      stiffness: 210,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [point, translateY]);

  if (!point) return null;

  const close = () => {
    Animated.timing(translateY, {
      duration: 220,
      toValue: 460,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          paddingBottom: insets.bottom + spacing.md,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>MY MEMORIES</Text>
          <Text style={styles.title}>{point.location}</Text>
          <Text style={styles.subtitle}>이 장소에서 기록한 추억 {point.diaries.length}개</Text>
        </View>
        <Pressable accessibilityLabel="기록 목록 닫기" onPress={close} style={styles.closeButton}>
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {point.diaries.map((diary) => (
          <DiaryListItem
            diary={diary}
            key={diary.id}
            location={point.location}
            onPress={() => onOpenDiary(diary, point.location)}
            variant="homeSheet"
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sheet: {
    backgroundColor: 'rgba(255, 253, 249, 0.98)',
    borderColor: 'rgba(255,255,255,0.9)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    bottom: 0,
    elevation: 16,
    left: 0,
    maxHeight: '51%',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
    shadowColor: '#8F6070',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
  },
  handle: { alignSelf: 'center', backgroundColor: '#C7B6BE', borderRadius: 3, elevation: 1, height: 5, marginBottom: spacing.md, shadowColor: '#8F6070', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, width: 44 },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  headerText: { flex: 1, paddingRight: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#433942', fontFamily: colors.fontFamily, fontSize: 27, marginTop: 2 },
  subtitle: { color: '#887982', fontSize: 12, marginTop: 2 },
  closeButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: 18, elevation: 2, height: 36, justifyContent: 'center', shadowColor: '#A77D8B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, width: 36 },
  closeIcon: { color: colors.text, fontSize: 25, lineHeight: 27 },
  list: { gap: spacing.sm, paddingBottom: spacing.md, paddingTop: spacing.md },
});
