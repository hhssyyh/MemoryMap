import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkIcon } from '../components/BookmarkIcon';
import { ThemedText as Text } from '../components/ThemedText';
import { useDiaries } from '../context/DiaryContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { DiaryEntry } from '../types/diary';
import { isTablet } from '../utils/isTablet';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryDetail'>;

const { width: screenWidth } = Dimensions.get('window');
const heroHeight = 360;

function getDiaryPhotos(photoUri?: string, photoUris?: string[]) {
  const photos = photoUris?.length ? photoUris : photoUri ? [photoUri] : [];
  return Array.from(new Set(photos.filter(Boolean)));
}

export function DiaryDetailScreen({ navigation, route }: Props) {
  const { deleteDiary, getDiary, points, toggleDiarySaved } = useDiaries();
  const insets = useSafeAreaInsets();
  const routeDiary = route.params.diary;
  const [storedDiary, setStoredDiary] = useState<DiaryEntry>();
  useEffect(() => {
    void getDiary(routeDiary.id).then((entry) => setStoredDiary(entry ?? undefined));
  }, [getDiary, routeDiary.id]);
  const point = points.find((item) => item.diaries.some((diary) => diary.id === routeDiary.id));
  const diary = storedDiary ?? point?.diaries.find((item) => item.id === routeDiary.id) ?? routeDiary;
  const location = storedDiary?.location ?? point?.location ?? route.params.location;
  const photos = useMemo(() => getDiaryPhotos(diary.photoUri, diary.photoUris), [diary.photoUri, diary.photoUris]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const tags = diary.tags?.length ? diary.tags : ['여행일기', location.split(',')[0]];

  const closeDetail = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // 딥링크나 개발용 직접 진입처럼 상세 화면이 root인 경우에는 다이어리 탭으로 복귀한다.
    navigation.replace('MainTabs', { screen: 'Diary' });
  }, [navigation]);

  const onPhotoScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setPhotoIndex(Math.max(0, Math.min(nextIndex, photos.length - 1)));
  };

  const confirmDelete = () => {
    Alert.alert('기록 삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void deleteDiary(diary.id).then(closeDetail);
        },
      },
    ]);
  };

  const shareDiary = async () => {
    await Share.share({
      message: `${diary.title}\n${location}\n${diary.summary}`,
      title: diary.title,
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />

      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {photos.length ? (
            <ScrollView
              directionalLockEnabled
              horizontal
              nestedScrollEnabled
              onMomentumScrollEnd={onPhotoScroll}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.photoPager}
            >
              {photos.map((photo) => (
                <Image key={photo} resizeMode="cover" source={{ uri: photo }} style={styles.heroPhoto} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroFallbackText}>사진 없음</Text>
            </View>
          )}

          <View pointerEvents="none" style={styles.heroOverlay} />
          <View pointerEvents="none" style={styles.heroText}>
            <Text style={styles.placeLine}>⌖ {location.split(',')[0]}</Text>
            <Text style={styles.title}>{diary.title}</Text>
            <View style={styles.heroDatePill}>
              <Text style={styles.heroDateText}>{diary.date} · {diary.time ?? '19:32'}</Text>
            </View>
          </View>

          {photos.length > 1 ? (
            <View pointerEvents="none" style={styles.photoCount}>
              <Text style={styles.photoCountText}>{photoIndex + 1} / {photos.length}</Text>
            </View>
          ) : null}

        </View>

        <View style={styles.sheet}>
          <View style={styles.metaCard}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>▣</Text>
              <View>
                <Text style={styles.metaMain}>{diary.date}</Text>
                <Text style={styles.metaSub}>{diary.time ?? '19:32'}</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>☼</Text>
              <View>
                <Text style={styles.metaMain}>{diary.temperature ?? '22도'}</Text>
                <Text style={styles.metaSub}>{diary.weather ?? '맑음'}</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⌖</Text>
              <View style={styles.metaLocationText}>
                <Text numberOfLines={1} style={styles.metaMain}>{location.split(',')[0]}</Text>
                <Text numberOfLines={1} style={styles.metaSub}>
                  {location.includes(',') ? location.split(',').slice(1).join(',').trim() : '저장된 장소'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.noteCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>❀</Text>
              <Text style={styles.cardTitle}>기록 메모</Text>
              <Pressable
                accessibilityLabel="기록 수정"
                accessibilityRole="button"
                onPress={() => navigation.navigate('EditDiary', { diaryId: diary.id })}
                style={({ pressed }) => [styles.editCircle, pressed && styles.pressed]}
              >
                <Text style={styles.editIcon}>✎</Text>
              </Pressable>
            </View>
            <View style={styles.noteBodyRow}>
              <Text style={styles.body}>{diary.summary}</Text>
              <Image
                resizeMode="cover"
                source={{ uri: photos[1] ?? photos[0] ?? 'https://picsum.photos/seed/paris-note/600/420' }}
                style={styles.noteIllustration}
              />
            </View>
          </View>

          <View style={styles.tagCard}>
            <View style={styles.cardHeaderCompact}>
              <Text style={styles.cardIcon}>⌑</Text>
              <Text style={styles.cardTitle}>태그</Text>
            </View>
            <View style={styles.tags}>
              {tags.map((tag) => (
                <Pressable
                  accessibilityLabel={`#${tag} 태그로 검색`}
                  accessibilityRole="button"
                  key={tag}
                  onPress={() => navigation.navigate('SearchDiary', { tag: `#${tag}` })}
                  style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
                >
                  <Text style={styles.tagText}>#{tag}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View pointerEvents="box-none" style={[styles.topBar, { top: insets.top + 10 }]}>
        <Pressable
          accessibilityLabel="상세 닫기"
          accessibilityRole="button"
          onPress={closeDetail}
          style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}
        >
          <Text style={styles.topButtonText}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="기록 수정"
          accessibilityRole="button"
          onPress={() => navigation.navigate('EditDiary', { diaryId: diary.id })}
          style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}
        >
          <Text style={styles.moreText}>⋯</Text>
        </Pressable>
      </View>

      <View style={[styles.actionBar, { bottom: insets.bottom + 10 }]}>
        {isTablet() ? (
          <>
            <Pressable
              accessibilityLabel="손글씨 프로토타입"
              accessibilityRole="button"
              onPress={() => navigation.navigate('HandwritingPrototype', { diary })}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Text style={styles.actionIcon}>✎</Text>
              <Text style={styles.actionText}>손글씨</Text>
            </Pressable>
            <View style={styles.actionDivider} />
          </>
        ) : null}
        <Pressable
          onPress={() => void toggleDiarySaved(diary.id)}
          style={({ pressed }) => [styles.action, diary.isSaved && styles.actionSaved, pressed && styles.pressed]}
        >
          <BookmarkIcon color={diary.isSaved ? pink : ink} filled={Boolean(diary.isSaved)} size={24} />
          <Text style={[styles.actionText, diary.isSaved && styles.actionTextActive]}>
            {diary.isSaved ? '보관됨' : '보관하기'}
          </Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable onPress={confirmDelete} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionIcon}>⌫</Text>
          <Text style={styles.actionText}>삭제</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable onPress={() => void shareDiary()} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionIcon}>⇧</Text>
          <Text style={styles.actionText}>공유하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const pink = '#F28D9B';
const ink = '#56484A';
const muted = '#9A8080';
const chip = '#FBE1E3';

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFF7F4', flex: 1 },
  content: { backgroundColor: '#FFF7F4' },
  hero: { height: heroHeight, overflow: 'hidden' },
  photoPager: { height: heroHeight, width: screenWidth },
  heroPhoto: { height: heroHeight, width: screenWidth },
  heroFallback: { alignItems: 'center', backgroundColor: '#F8DFDF', height: heroHeight, justifyContent: 'center', width: screenWidth },
  heroFallbackText: { color: muted, fontSize: 13 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', left: 24, position: 'absolute', right: 24, zIndex: 20 },
  topButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  topButtonText: { color: '#FFFFFF', fontSize: 38, lineHeight: 40, textShadowColor: 'rgba(35, 22, 27, 0.72)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  moreText: { color: '#FFFFFF', fontSize: 27, lineHeight: 28, marginTop: -8, textShadowColor: 'rgba(35, 22, 27, 0.72)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(54, 37, 43, 0.26)' },
  heroText: { bottom: 34, left: 24, position: 'absolute', right: 28 },
  placeLine: { color: '#FFE7EC', fontSize: 13, fontWeight: '700', letterSpacing: 0.4, marginBottom: 10, textShadowColor: 'rgba(35, 22, 27, 0.35)', textShadowRadius: 5 },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '700', lineHeight: 39, textShadowColor: 'rgba(35, 22, 27, 0.42)', textShadowRadius: 8 },
  heroDatePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.46)', borderRadius: 14, borderWidth: 1, marginTop: 14, paddingHorizontal: 10, paddingVertical: 5 },
  heroDateText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  photoCount: {
    backgroundColor: 'rgba(61, 55, 58, 0.58)',
    borderColor: 'rgba(255,255,255,0.34)',
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 5,
    position: 'absolute',
    right: 24,
    top: 92,
  },
  photoCountText: { color: '#FFFFFF', fontSize: 14 },
  sheet: {
    backgroundColor: '#FFF7F4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingTop: 30,
    shadowColor: '#D69AA8',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  metaCard: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(241, 209, 215, 0.9)',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#D79AA8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
  },
  metaItem: { alignItems: 'flex-start', flex: 1, flexDirection: 'row', gap: 8 },
  metaIcon: { color: muted, fontSize: 20, lineHeight: 24 },
  metaMain: { color: ink, fontSize: 14, lineHeight: 20 },
  metaSub: { color: muted, fontSize: 13, lineHeight: 20, marginTop: 2 },
  metaLocationText: { flex: 1 },
  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderColor: 'rgba(241, 209, 215, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 5,
    marginTop: 22,
    minHeight: 238,
    padding: 20,
    shadowColor: '#C98595',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 20 },
  cardHeaderCompact: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  cardIcon: { color: pink, fontSize: 24, marginRight: 10 },
  cardTitle: { color: ink, flex: 1, fontSize: 20, fontWeight: '700' },
  editCircle: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  editIcon: { color: pink, fontSize: 24, textShadowColor: 'rgba(185, 72, 90, 0.18)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  noteBodyRow: { flexDirection: 'row' },
  body: { color: ink, flex: 1.15, fontSize: 15, lineHeight: 29 },
  noteIllustration: { alignSelf: 'flex-end', borderRadius: 10, elevation: 3, flex: 0.85, height: 128, marginLeft: 10, opacity: 0.78, shadowColor: '#9C707A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
  tagCard: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderColor: 'rgba(241, 209, 215, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    marginTop: 22,
    padding: 20,
    shadowColor: '#C98595',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { backgroundColor: chip, borderColor: 'rgba(205, 118, 137, 0.18)', borderRadius: 16, borderWidth: 1, elevation: 1, paddingHorizontal: 15, paddingVertical: 8, shadowColor: '#D5909F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5 },
  tagText: { color: '#B9485A', fontSize: 14 },
  actionBar: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 9,
    flexDirection: 'row',
    height: 72,
    left: 20,
    overflow: 'hidden',
    position: 'absolute',
    right: 20,
    shadowColor: '#8F5F70',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  action: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  actionSaved: { backgroundColor: 'rgba(251, 225, 227, 0.7)' },
  actionIcon: { color: ink, fontSize: 22, marginBottom: 4 },
  actionText: { color: ink, fontSize: 12 },
  actionTextActive: { color: '#EC6381' },
  actionDivider: { alignSelf: 'center', backgroundColor: '#F0DEDE', height: 40, width: 1 },
});
