import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import type { DiaryEntry } from '../types/diary';

type DiaryListItemProps = {
  diary: DiaryEntry;
  location?: string;
};

export function DiaryListItem({ diary, location }: DiaryListItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{diary.emoji}</Text>
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
    </View>
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
  emojiContainer: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 15,
    height: 52,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 52,
  },
  emoji: {
    fontSize: 25,
  },
  content: {
    flex: 1,
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
});
