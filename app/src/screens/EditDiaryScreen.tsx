import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { DiaryPhotoPicker } from '../components/DiaryPhotoPicker';
import { useDiaries } from '../context/DiaryContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ThemedText as Text } from '../components/ThemedText';

type Props = NativeStackScreenProps<RootStackParamList, 'EditDiary'>;

export function EditDiaryScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { points, updateDiary } = useDiaries();
  const sourcePoint = points.find((point) => point.diaries.some((diary) => diary.id === route.params.diaryId));
  const diary = sourcePoint?.diaries.find((item) => item.id === route.params.diaryId);
  const [pointId, setPointId] = useState(sourcePoint?.id ?? '');
  const [title, setTitle] = useState(diary?.title ?? '');
  const [summary, setSummary] = useState(diary?.summary ?? '');
  const [photoUri, setPhotoUri] = useState(diary?.photoUri);
  const insets = useSafeAreaInsets();

  if (!diary) return <View style={styles.screen}><Text style={styles.missing}>기록을 찾을 수 없습니다.</Text></View>;

  const save = () => {
    if (!pointId || !photoUri || !title.trim() || !summary.trim()) {
      Alert.alert('내용을 확인해 주세요', '사진, 장소, 제목, 기록을 모두 입력해 주세요.');
      return;
    }
    updateDiary({ diaryId: diary.id, pointId, title: title.trim(), summary: summary.trim(), date: diary.date, photoUri, photoUris: [photoUri] });
    navigation.goBack();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack}><Text style={styles.cancel}>취소</Text></Pressable>
        <Text style={styles.headerTitle}>기록 수정</Text>
        <Pressable onPress={save}><Text style={styles.save}>저장</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>저장된 장소</Text>
        <View style={styles.locations}>{points.map((point) => (
          <Pressable key={point.id} onPress={() => setPointId(point.id)} style={[styles.locationChip, point.id === pointId && styles.locationChipSelected]}>
            <Text style={[styles.locationText, point.id === pointId && styles.locationTextSelected]}>{point.location}</Text>
          </Pressable>
        ))}</View>
        <Text style={styles.label}>사진</Text>
        <DiaryPhotoPicker onChange={setPhotoUri} photoUri={photoUri} />
        <Text style={styles.label}>제목</Text>
        <TextInput onChangeText={setTitle} style={styles.input} value={title} />
        <Text style={styles.label}>기록</Text>
        <TextInput multiline onChangeText={setSummary} style={[styles.input, styles.summary]} textAlignVertical="top" value={summary} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, missing: { color: colors.textMuted, margin: spacing.xl, textAlign: 'center' },
  header: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, cancel: { color: colors.textMuted, fontSize: 15 }, save: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  content: { padding: spacing.lg }, label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md }, locations: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  locationChip: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 }, locationChipSelected: { backgroundColor: colors.primary }, locationText: { color: colors.text, fontWeight: '600' }, locationTextSelected: { color: colors.surface },
  input: { backgroundColor: colors.surface, borderRadius: 14, color: colors.text, elevation: 1, fontFamily: colors.fontFamily, fontSize: 16, padding: spacing.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }, summary: { minHeight: 150 },
});
