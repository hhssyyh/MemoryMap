import { useMemo, useState } from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryDetail'>;

const { width: screenWidth } = Dimensions.get('window');
const heroHeight = 360;

function getDiaryPhotos(photoUri?: string, photoUris?: string[]) {
  const photos = photoUris?.length ? photoUris : photoUri ? [photoUri] : [];
  return Array.from(new Set(photos.filter(Boolean)));
}

export function DiaryDetailScreen({ navigation, route }: Props) {
  const { deleteDiary, points, toggleDiarySaved } = useDiaries();
  const insets = useSafeAreaInsets();
  const routeDiary = route.params.diary;
  const point = points.find((item) => item.diaries.some((diary) => diary.id === routeDiary.id));
  const diary = point?.diaries.find((item) => item.id === routeDiary.id) ?? routeDiary;
  const location = point?.location ?? route.params.location;
  const photos = useMemo(() => getDiaryPhotos(diary.photoUri, diary.photoUris), [diary.photoUri, diary.photoUris]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const tags = diary.tags?.length ? diary.tags : ['여행일기', location.split(',')[0]];

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
          deleteDiary(diary.id);
          navigation.goBack();
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

          <View pointerEvents="none" style={styles.heroText}>
            <Text style={styles.placeLine}>⌖ {location.split(',')[0]}</Text>
            <Text style={styles.title}>{diary.title}</Text>
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
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}># {tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View pointerEvents="box-none" style={[styles.topBar, { top: insets.top + 10 }]}>
        <Pressable
          accessibilityLabel="상세 닫기"
          accessibilityRole="button"
          onPress={navigation.goBack}
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
        <Pressable
          onPress={() => toggleDiarySaved(diary.id)}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <BookmarkIcon filled={Boolean(diary.isSaved)} size={24} />
          <Text style={[styles.actionText, diary.isSaved && styles.actionTextActive]}>보관함에 저장</Text>
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 7,
    height: 44,
    justifyContent: 'center',
    shadowColor: '#8E6470',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: 44,
  },
  topButtonText: { color: ink, fontSize: 34, lineHeight: 36 },
  moreText: { color: ink, fontSize: 25, lineHeight: 26, marginTop: -8 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  heroText: { left: 24, position: 'absolute', right: 28, top: 190 },
  placeLine: { color: '#E77985', fontSize: 14, marginBottom: 12, textShadowColor: 'rgba(255,255,255,0.85)', textShadowRadius: 4 },
  title: { color: ink, fontSize: 29, fontWeight: '600', lineHeight: 37, textShadowColor: 'rgba(255,255,255,0.9)', textShadowRadius: 5 },
  photoCount: {
    alignSelf: 'center',
    backgroundColor: 'rgba(61, 55, 58, 0.58)',
    borderColor: 'rgba(255,255,255,0.34)',
    borderRadius: 15,
    borderWidth: 1,
    bottom: 12,
    paddingHorizontal: 13,
    paddingVertical: 5,
    position: 'absolute',
  },
  photoCountText: { color: '#FFFFFF', fontSize: 14 },
  sheet: {
    backgroundColor: '#FFF7F4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -1,
    paddingHorizontal: 20,
    paddingTop: 26,
    shadowColor: '#D69AA8',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  metaCard: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
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
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 5,
    marginTop: 22,
    minHeight: 250,
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
  editCircle: { alignItems: 'center', backgroundColor: pink, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 22, borderWidth: 1, elevation: 5, height: 44, justifyContent: 'center', shadowColor: pink, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.28, shadowRadius: 12, width: 44 },
  editIcon: { color: '#FFFFFF', fontSize: 22 },
  noteBodyRow: { flexDirection: 'row' },
  body: { color: ink, flex: 1.15, fontSize: 15, lineHeight: 29 },
  noteIllustration: { alignSelf: 'flex-end', borderRadius: 10, elevation: 3, flex: 0.85, height: 128, marginLeft: 10, opacity: 0.78, shadowColor: '#9C707A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
  tagCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
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
  tag: { backgroundColor: chip, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 16, borderWidth: 1, elevation: 1, paddingHorizontal: 15, paddingVertical: 8, shadowColor: '#D5909F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5 },
  tagText: { color: '#B9485A', fontSize: 14 },
  actionBar: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
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
  actionIcon: { color: ink, fontSize: 22, marginBottom: 4 },
  actionText: { color: ink, fontSize: 12 },
  actionTextActive: { color: '#EC6381' },
  actionDivider: { alignSelf: 'center', backgroundColor: '#F0DEDE', height: 40, width: 1 },
});
