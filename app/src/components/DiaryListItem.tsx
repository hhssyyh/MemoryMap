import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText as Text } from './ThemedText';

import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import type { DiaryEntry } from '../types/diary';

type DiaryListItemProps = {
  diary: DiaryEntry;
  location?: string;
  onPress?: () => void;
  variant?: 'default' | 'homeSheet';
};

export function DiaryListItem({ diary, location, onPress, variant = 'default' }: DiaryListItemProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  if (variant === 'homeSheet') {
    return (
      <Pressable
        accessibilityLabel={`${diary.title} 상세 보기`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.homeCard, pressed && styles.pressed]}
      >
        <View style={styles.homePhotoContainer}>
          {diary.photoUri ? (
            <Image source={{ uri: diary.photoUri }} style={styles.photo} />
          ) : (
            <Text style={styles.photoEmpty}>사진 없음</Text>
          )}
        </View>
        <View style={styles.homeContent}>
          <Text numberOfLines={1} style={styles.homeTitle}>{diary.title}</Text>
          <Text numberOfLines={2} style={styles.homeSummary}>{diary.summary}</Text>
          <View style={styles.homeMetaRow}>
            <View style={styles.homeLocationRow}>
              <Text style={styles.pin}>●</Text>
              <Text numberOfLines={1} style={styles.homeLocation}>{location}</Text>
            </View>
            <Text style={styles.homeDate}>{diary.date}</Text>
          </View>
        </View>
        <View accessibilityLabel="북마크" style={styles.bookmark}>
          <View style={styles.bookmarkNotch} />
        </View>
      </Pressable>
    );
  }

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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    elevation: 2,
    flexDirection: 'row',
    padding: 13,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
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
  homeCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 253, 0.92)',
    borderRadius: 20,
    flexDirection: 'row',
    height: 124,
    padding: 10,
    shadowColor: '#B98D9B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  homePhotoContainer: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 15,
    justifyContent: 'center',
    height: 102,
    marginRight: 13,
    overflow: 'hidden',
    width: 106,
  },
  homeContent: { alignSelf: 'stretch', flex: 1, justifyContent: 'center', paddingRight: 12 },
  homeTitle: { color: '#40383E', fontSize: 17, fontWeight: '700', marginBottom: 7 },
  homeSummary: { color: '#635961', fontSize: 12, lineHeight: 18, minHeight: 36 },
  homeMetaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  homeLocationRow: { alignItems: 'center', flexDirection: 'row', flex: 1, marginRight: 8 },
  pin: { color: '#C291A0', fontSize: 9, marginRight: 6 },
  homeLocation: { color: '#7B6E76', flex: 1, fontSize: 12 },
  homeDate: { color: '#A5969E', fontSize: 11, marginLeft: 6 },
  bookmark: { backgroundColor: colors.accent, borderTopLeftRadius: 3, borderTopRightRadius: 3, height: 22, position: 'absolute', right: 13, top: 11, width: 14 },
  bookmarkNotch: { borderBottomColor: 'rgba(255, 253, 253, 0.98)', borderBottomWidth: 5, borderLeftColor: 'transparent', borderLeftWidth: 7, borderRightColor: 'transparent', borderRightWidth: 7, bottom: 0, height: 0, position: 'absolute', width: 0 },
});
