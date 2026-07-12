import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, Share, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MemoryMap } from '../components/MemoryMap';
import { spacing, type ThemeColors } from '../constants/theme';
import { useDiaries } from '../context/DiaryContext';
import { useAppTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ThemedText as Text } from '../components/ThemedText';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryDetail'>;

export function DiaryDetailScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { points } = useDiaries();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const routeDiary = route.params.diary;
  const point = points.find((item) => item.diaries.some((diary) => diary.id === routeDiary.id));
  const diary = point?.diaries.find((item) => item.id === routeDiary.id) ?? routeDiary;
  const location = point?.location ?? route.params.location;

  const shareDiary = () => Share.share({ message: `${diary.title}\n${location}\n${diary.summary}` });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {!detailFullscreen ? (
        <View style={styles.mapHeader}>
          {point ? (
            <MemoryMap
              compact
              currentLocation={null}
              expanded
              focusCoordinate={point.coordinate}
              highlightedPointId={point.id}
              isLocating={false}
              onRequestLocation={async () => undefined}
              points={points}
            />
          ) : (
            <View style={styles.mapFallback} />
          )}
        </View>
      ) : null}

      <View style={[styles.topActions, { top: insets.top + spacing.sm }]}>
        <Pressable accessibilityLabel="뒤로 가기" onPress={navigation.goBack} style={styles.roundButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.topActionGroup}>
          <Pressable accessibilityLabel="기록 공유" onPress={() => void shareDiary()} style={styles.roundButton}>
            <Text style={styles.topIcon}>↥</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={detailFullscreen ? '상세 팝업 축소' : '상세 팝업 전체화면으로 보기'}
            accessibilityRole="button"
            onPress={() => setDetailFullscreen((value) => !value)}
            style={styles.roundButton}
          >
            <Text style={styles.topIcon}>{detailFullscreen ? '⊡' : '⛶'}</Text>
          </Pressable>
          <Pressable accessibilityLabel="기록 수정" onPress={() => navigation.navigate('EditDiary', { diaryId: diary.id })} style={styles.roundButton}>
            <Text style={styles.topIcon}>•••</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.sheet, detailFullscreen && styles.sheetFullscreen]}>
        <View style={styles.handle} />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: insets.bottom + spacing.xl,
              paddingTop: detailFullscreen ? insets.top + 74 : spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.location}>⌖  {location}</Text>
          <Text style={styles.title}>{diary.title}</Text>

          <View style={styles.quoteCard}>
            <Text style={styles.quoteMark}>“</Text>
            <Text style={styles.quote}>{diary.summary}</Text>
          </View>

          <View style={styles.photoContainer}>
            {diary.photoUri ? (
              <Image resizeMode="cover" source={{ uri: diary.photoUri }} style={styles.photo} />
            ) : (
              <Text style={styles.photoEmpty}>사진 없음</Text>
            )}
            <View style={styles.photoCount}><Text style={styles.photoCountText}>1 / 1</Text></View>
          </View>

          <View style={styles.metaSection}>
            <View style={styles.metaRow}><Text style={styles.metaIcon}>□</Text><Text style={styles.metaText}>{diary.date}</Text></View>
            <View style={styles.metaRow}><Text style={styles.metaIcon}>⌖</Text><Text style={styles.metaText}>{location}</Text></View>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={() => setLiked((value) => !value)} style={[styles.actionButton, liked && styles.actionButtonActive]}>
              <Text style={[styles.actionIcon, liked && styles.actionTextActive]}>{liked ? '♥' : '♡'}</Text>
              <Text style={[styles.actionText, liked && styles.actionTextActive]}>{liked ? '저장됨' : '보관함에 저장'}</Text>
            </Pressable>
            {/* <Pressable onPress={() => setSaved((value) => !value)} style={[styles.actionButton, saved && styles.actionButtonActive]}>
              <Text style={[styles.actionIcon, saved && styles.actionTextActive]}>♧</Text>
              <Text style={[styles.actionText, saved && styles.actionTextActive]}>{saved ? '저장됨' : '보관함에 저장'}</Text>
            </Pressable> */}
            <Pressable onPress={() => setSaved((value) => !value)} style={[styles.actionButton, saved && styles.actionButtonActive]}>
              <Text style={[styles.actionIcon]}>♧</Text>
              <Text style={[styles.actionText]}>삭제</Text>
            </Pressable>
            <Pressable onPress={() => void shareDiary()} style={styles.actionButton}>
              <Text style={styles.actionIcon}>↥</Text><Text style={styles.actionText}>공유하기</Text>
            </Pressable>
          </View>

          <View style={styles.memoSection}>
            <View style={styles.sectionTitleRow}><Text style={styles.sectionIcon}>✿</Text><Text style={styles.sectionTitle}>기록 메모</Text></View>
            <Text style={styles.memo}>{diary.summary}</Text>
          </View>

          <View style={styles.tagSection}>
            <Text style={styles.sectionTitle}>태그</Text>
            <View style={styles.tags}>
              <View style={styles.tag}><Text style={styles.tagText}>#{location.replace(/\s/g, '')}</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>#추억</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>#여행일기</Text></View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.map, flex: 1 },
  mapHeader: { height: '31%', minHeight: 230 },
  mapFallback: { backgroundColor: colors.map, flex: 1 },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', left: spacing.md, position: 'absolute', right: spacing.md, zIndex: 5 },
  topActionGroup: { flexDirection: 'row', gap: spacing.sm },
  roundButton: { alignItems: 'center', backgroundColor: 'rgba(255, 253, 249, 0.86)', borderRadius: 20, elevation: 4, height: 46, justifyContent: 'center', shadowColor: colors.text, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, width: 46 },
  backIcon: { color: colors.text, fontSize: 36, lineHeight: 38 },
  topIcon: { color: colors.text, fontSize: 20, lineHeight: 22 },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, flex: 1, marginTop: -28, overflow: 'hidden' },
  sheetFullscreen: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0 },
  handle: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: 3, height: 5, marginTop: spacing.sm, width: 48 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  location: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  title: { color: colors.text, fontSize: 31, fontWeight: '800', letterSpacing: -0.8, marginTop: spacing.md },
  quoteCard: { flexDirection: 'row', marginVertical: spacing.lg },
  quoteMark: { color: colors.primary, fontSize: 34, lineHeight: 30, marginRight: spacing.sm, opacity: 0.65 },
  quote: { color: colors.text, flex: 1, fontSize: 16, lineHeight: 26 },
  photoContainer: { alignItems: 'center', aspectRatio: 4 / 3, backgroundColor: colors.primarySoft, borderRadius: 24, justifyContent: 'center', overflow: 'hidden', position: 'relative', width: '100%' },
  photo: { height: '100%', width: '100%' },
  photoEmpty: { color: colors.textMuted },
  photoCount: { backgroundColor: 'rgba(255,253,249,0.88)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, position: 'absolute', right: 12, top: 12 },
  photoCountText: { color: colors.text, fontSize: 12 },
  metaSection: { gap: 12, paddingVertical: spacing.lg },
  metaRow: { alignItems: 'center', flexDirection: 'row' },
  metaIcon: { color: colors.primary, fontSize: 17, width: 30 },
  metaText: { color: colors.textMuted, flex: 1, fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, elevation: 2, flex: 1, justifyContent: 'center', minHeight: 68, paddingHorizontal: spacing.xs, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8 },
  actionButtonActive: { backgroundColor: colors.primarySoft },
  actionIcon: { color: colors.textMuted, fontSize: 22 },
  actionText: { color: colors.text, fontSize: 11, marginTop: 4, textAlign: 'center' },
  actionTextActive: { color: colors.primary },
  memoSection: { marginTop: spacing.xl },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row' },
  sectionIcon: { color: colors.primary, fontSize: 19, marginRight: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  memo: { color: colors.text, fontSize: 15, lineHeight: 26, marginTop: spacing.md },
  tagSection: { marginTop: spacing.xl },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tag: { backgroundColor: colors.primarySoft, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  tagText: { color: colors.textMuted, fontSize: 12 },
});
