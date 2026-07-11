import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import type { DiaryEntry } from '../types/diary';

type DiaryListItemProps = {
  diary: DiaryEntry;
  location?: string;
  onPress?: () => void;
};

export function DiaryListItem({ diary, location, onPress }: DiaryListItemProps) {
  return (
    <Pressable
      accessibilityLabel={`${diary.title} 상세 보기`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.photoContainer}>
        {diary.photoUri ? <Image source={{ uri: diary.photoUri }} style={styles.photo} /> : <Text style={styles.photoEmpty}>사진 없음</Text>}
      </View>
      <View style={styles.content}>
        <View style={styles.metaRow}>
          {location ? <Text style={styles.location}>{location}</Text> : null}
          <Text style={styles.date}>{diary.date}</Text>
        </View>
        <Text numberOfLines={1} style={styles.title}>
          {diary.title}
        </Text>
        <Text numberOfLines={2} style={styles.summary}>
          {diary.summary}
        </Text>
      </View>
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 13,
  },
  photoContainer: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 15,
    height: 52,
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
    width: 52,
  },
  photo: { height: '100%', width: '100%' },
  photoEmpty: { color: colors.textMuted, fontSize: 9 },
  content: {
    flex: 1,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 25,
    marginLeft: spacing.sm,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  location: {
    color: colors.accent,
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  date: {
    color: colors.textMuted,
    fontSize: 11,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  summary: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
});
