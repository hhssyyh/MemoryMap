import { Image, Pressable, StyleSheet, View } from 'react-native';

import { spacing, type ThemeColors } from '../constants/theme';
import { useDiaries } from '../context/DiaryContext';
import { useAppTheme } from '../context/ThemeContext';
import type { DiaryEntry } from '../types/diary';
import { BookmarkIcon } from './BookmarkIcon';
import { ThemedText as Text } from './ThemedText';

type DiaryListItemProps = {
  diary: DiaryEntry;
  location?: string;
  onPress?: () => void;
  variant?: 'default' | 'homeSheet';
};

export function DiaryListItem({ diary, location, onPress, variant = 'default' }: DiaryListItemProps) {
  const { colors } = useAppTheme();
  const { toggleDiarySaved } = useDiaries();
  const styles = createStyles(colors);
  const photoUri = diary.photoUris?.[0] ?? diary.photoUri;

  const saveButton = (floating = false) => (
    <Pressable
      accessibilityLabel={diary.isSaved ? '보관함에서 제거' : '보관함에 저장'}
      accessibilityRole="button"
      hitSlop={10}
      onPress={(event) => {
        event.stopPropagation();
        toggleDiarySaved(diary.id);
      }}
      style={({ pressed }) => [
        floating ? styles.floatingSaveButton : styles.inlineSaveButton,
        pressed && styles.saveButtonPressed,
      ]}
    >
      <BookmarkIcon color={colors.primary} filled={diary.isSaved} size={floating ? 22 : 23} />
    </Pressable>
  );

  if (variant === 'homeSheet') {
    return (
      <Pressable
        accessibilityLabel={`${diary.title} 상세 보기`}
        accessibilityRole={onPress ? 'button' : undefined}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.homeCard, pressed && styles.pressed]}
      >
        <View style={styles.homePhotoContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
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
        {saveButton(true)}
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
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <Text style={styles.photoEmpty}>사진 없음</Text>}
      </View>
      <View style={styles.content}>
        <View style={styles.metaRow}>
          {location ? <Text style={styles.location}>{location}</Text> : null}
          <Text style={styles.date}>{diary.date}</Text>
        </View>
        <Text numberOfLines={1} style={styles.title}>{diary.title}</Text>
        <Text numberOfLines={2} style={styles.summary}>{diary.summary}</Text>
      </View>
      {saveButton(false)}
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center', backgroundColor: 'rgba(255, 253, 253, 0.94)', borderColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 18, borderWidth: 1, elevation: 4, flexDirection: 'row', padding: 13, shadowColor: '#B98D9B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.13, shadowRadius: 14,
  },
  photoContainer: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 15, elevation: 2, height: 52, justifyContent: 'center', marginRight: spacing.md, overflow: 'hidden', shadowColor: '#A77D8B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, width: 52 },
  photo: { height: '100%', width: '100%' },
  photoEmpty: { color: colors.textMuted, fontSize: 9 },
  content: { flex: 1 },
  chevron: { color: colors.textMuted, fontSize: 25, marginLeft: spacing.xs },
  metaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  location: { color: colors.accent, flex: 1, fontSize: 11, fontWeight: '700', marginRight: spacing.sm },
  date: { color: colors.textMuted, fontSize: 11 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  summary: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  inlineSaveButton: { alignItems: 'center', height: 34, justifyContent: 'center', marginLeft: spacing.sm, width: 34 },
  floatingSaveButton: { alignItems: 'center', height: 30, justifyContent: 'center', position: 'absolute', right: 8, top: 7, width: 30 },
  saveButtonPressed: { opacity: 0.65, transform: [{ scale: 0.94 }] },
  homeCard: { alignItems: 'center', backgroundColor: 'rgba(255, 253, 253, 0.96)', borderColor: 'rgba(255,255,255,0.95)', borderRadius: 20, borderWidth: 1, elevation: 5, flexDirection: 'row', height: 124, padding: 10, shadowColor: '#B98D9B', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.14, shadowRadius: 16 },
  homePhotoContainer: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 15, elevation: 3, height: 102, justifyContent: 'center', marginRight: 13, overflow: 'hidden', shadowColor: '#A77D8B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10, width: 106 },
  homeContent: { alignSelf: 'stretch', flex: 1, justifyContent: 'center', paddingRight: 12 },
  homeTitle: { color: '#40383E', fontSize: 17, fontWeight: '700', marginBottom: 7 },
  homeSummary: { color: '#635961', fontSize: 12, lineHeight: 18, minHeight: 36 },
  homeMetaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  homeLocationRow: { alignItems: 'center', flex: 1, flexDirection: 'row', marginRight: 8 },
  pin: { color: '#C291A0', fontSize: 9, marginRight: 6 },
  homeLocation: { color: '#7B6E76', flex: 1, fontSize: 12 },
  homeDate: { color: '#A5969E', fontSize: 11, marginLeft: 6 },
});
