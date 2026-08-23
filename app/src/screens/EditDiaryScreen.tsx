import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { CollectionSelector } from '../components/CollectionSelector';
import { DiaryPhotoPicker } from '../components/DiaryPhotoPicker';
import { useDiaries } from '../context/DiaryContext';
import { SQLiteCollectionRepository } from '../data/SQLiteCollectionRepository';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { DiaryCollection } from '../types/collection';
import { ThemedText as Text } from '../components/ThemedText';

type Props = NativeStackScreenProps<RootStackParamList, 'EditDiary'>;
const collectionRepository = new SQLiteCollectionRepository();

function getInitialPhotos(photoUri?: string, photoUris?: string[]) {
  return Array.from(new Set((photoUris?.length ? photoUris : photoUri ? [photoUri] : []).filter(Boolean)));
}

export function EditDiaryScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { points, updateDiary } = useDiaries();
  const sourcePoint = points.find((point) => point.diaries.some((diary) => diary.id === route.params.diaryId));
  const diary = sourcePoint?.diaries.find((item) => item.id === route.params.diaryId);
  const [title, setTitle] = useState(diary?.title ?? '');
  const [summary, setSummary] = useState(diary?.summary ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(diary?.tags ?? []);
  const [collections, setCollections] = useState<DiaryCollection[]>([]);
  const [collectionId, setCollectionId] = useState<string>();
  const [photoUris, setPhotoUris] = useState<string[]>(() => getInitialPhotos(diary?.photoUri, diary?.photoUris));
  const [coverPhotoUri, setCoverPhotoUri] = useState<string | undefined>(() => diary?.photos?.find((photo) => photo.isCover)?.fileUri ?? getInitialPhotos(diary?.photoUri, diary?.photoUris)[0]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void Promise.all([
      collectionRepository.listCollections(),
      collectionRepository.listCollectionIdsForDiary(route.params.diaryId),
    ]).then(([nextCollections, collectionIds]) => {
      setCollections(nextCollections);
      setCollectionId(collectionIds[0]);
    });
  }, [route.params.diaryId]);

  if (!diary) return <View style={styles.screen}><Text style={styles.missing}>기록을 찾을 수 없습니다.</Text></View>;

  const addTag = () => {
    const nextTag = tagInput.trim().replace(/^#\s*/, '');
    if (!nextTag) return;

    setTags((current) =>
      current.some((tag) => tag.toLocaleLowerCase() === nextTag.toLocaleLowerCase())
        ? current
        : [...current, nextTag],
    );
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  };

  const selectCoverPhoto = (uri: string) => {
    if (photoUris.includes(uri)) setCoverPhotoUri(uri);
  };

  const save = async () => {
    if (!sourcePoint?.id || !photoUris.length || !title.trim() || !summary.trim()) {
      Alert.alert('내용을 확인해 주세요', '사진, 제목, 기록을 모두 입력해 주세요.');
      return;
    }

    const pendingTag = tagInput.trim().replace(/^#\s*/, '');
    const nextTags = pendingTag
      ? Array.from(new Set([...tags, pendingTag]))
      : tags;

    const orderedPhotoUris = coverPhotoUri
      ? [coverPhotoUri, ...photoUris.filter((uri) => uri !== coverPhotoUri)]
      : photoUris;

    try {
      await updateDiary({
        diaryId: diary.id,
        pointId: sourcePoint.id,
        title: title.trim(),
        summary: summary.trim(),
        date: diary.date,
        photoUri: orderedPhotoUris[0],
        photoUris: orderedPhotoUris,
        tags: nextTags,
        collectionId: collectionId ?? null,
      });
      navigation.goBack();
    } catch {
      Alert.alert('저장하지 못했습니다', '사진 파일 또는 로컬 저장소를 확인한 뒤 다시 시도해 주세요.');
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack}><Text style={styles.cancel}>취소</Text></Pressable>
        <Text style={styles.headerTitle}>기록 수정</Text>
        <Pressable onPress={() => void save()}><Text style={styles.save}>저장</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>사진</Text>
        <Text style={styles.photoHint}>사진을 탭해 대표 사진을 지정할 수 있어요.</Text>
        <DiaryPhotoPicker
          coverPhotoUri={coverPhotoUri}
          multiple
          onChange={(uri) => setPhotoUris([uri])}
          onChangeMultiple={(uris) => {
            setPhotoUris(uris);
            setCoverPhotoUri((current) => current && uris.includes(current) ? current : uris[0]);
          }}
          onCoverPhotoChange={selectCoverPhoto}
          photoUri={photoUris[0]}
          photoUris={photoUris}
        />
        <Text style={styles.label}>제목</Text>
        <TextInput onChangeText={setTitle} style={styles.input} value={title} />
        <Text style={styles.label}>기록</Text>
        <TextInput multiline onChangeText={setSummary} style={[styles.input, styles.summary]} textAlignVertical="top" value={summary} />
        <Text style={styles.label}>모음집</Text>
        <CollectionSelector
          allowNone
          collections={collections}
          onSelect={setCollectionId}
          selectedCollectionId={collectionId}
        />
        <Text style={styles.label}>태그</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            placeholder="키워드 입력"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.tagInput}
            value={tagInput}
          />
          <Pressable
            accessibilityLabel="태그 추가"
            accessibilityRole="button"
            onPress={addTag}
            style={({ pressed }) => [styles.addTagButton, pressed && styles.pressed]}
          >
            <Text style={styles.addTagText}>추가</Text>
          </Pressable>
        </View>
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Pressable
              accessibilityLabel={`#${tag} 태그 삭제`}
              accessibilityRole="button"
              key={tag}
              onPress={() => removeTag(tag)}
              style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
            >
              <Text style={styles.tagText}>#{tag}</Text>
              <Text style={styles.removeTagText}>×</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>태그를 눌러 삭제할 수 있어요.</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, missing: { color: colors.textMuted, margin: spacing.xl, textAlign: 'center' },
  header: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, cancel: { color: colors.textMuted, fontSize: 15 }, save: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  content: { padding: spacing.lg }, label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md },
  photoHint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, marginTop: -spacing.xs },
  input: { backgroundColor: colors.surface, borderRadius: 14, color: colors.text, elevation: 1, fontFamily: colors.fontFamily, fontSize: 16, padding: spacing.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }, summary: { minHeight: 150 },
  tagInputRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  tagInput: { backgroundColor: colors.surface, borderRadius: 14, color: colors.text, elevation: 1, flex: 1, fontFamily: colors.fontFamily, fontSize: 16, padding: spacing.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  addTagButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, height: 50, justifyContent: 'center', paddingHorizontal: 18 },
  addTagText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.md },
  tag: { alignItems: 'center', backgroundColor: '#FBE1E3', borderColor: 'rgba(205, 118, 137, 0.18)', borderRadius: 16, borderWidth: 1, elevation: 1, flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 8, shadowColor: '#D5909F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5 },
  tagText: { color: '#B9485A', fontSize: 14 },
  removeTagText: { color: '#B9485A', fontSize: 16, fontWeight: '800', marginLeft: 7, marginTop: -1 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
});
