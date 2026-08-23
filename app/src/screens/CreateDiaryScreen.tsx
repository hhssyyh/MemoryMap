import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { DiaryPhotoPicker } from '../components/DiaryPhotoPicker';
import { useDiaries } from '../context/DiaryContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ThemedText as Text } from '../components/ThemedText';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateDiary'>;

export function CreateDiaryScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { addDiary, savedPoints } = useDiaries();
  const [pointId, setPointId] = useState(savedPoints[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!pointId && savedPoints[0]) setPointId(savedPoints[0].id);
  }, [pointId, savedPoints]);

  const save = async () => {
    if (!pointId || !photoUri || !title.trim() || !summary.trim()) {
      Alert.alert('내용을 확인해 주세요', '사진, 장소, 제목, 기록을 모두 입력해 주세요.');
      return;
    }

    try {
      await addDiary({
        pointId,
        title: title.trim(),
        summary: summary.trim(),
        photoUri,
        photoUris: [photoUri],
        date: new Date().toISOString().slice(0, 10),
        visitedAt: new Date().toISOString(),
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
        <Text style={styles.headerTitle}>새 기록</Text>
        <Pressable onPress={() => void save()}><Text style={styles.save}>저장</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>저장된 장소</Text>
        <View style={styles.locations}>
          {savedPoints.map((point) => (
            <Pressable
              key={point.id}
              onPress={() => setPointId(point.id)}
              style={[styles.locationChip, point.id === pointId && styles.locationChipSelected]}
            >
              <Text style={[styles.locationText, point.id === pointId && styles.locationTextSelected]}>
                {point.location}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>사진</Text>
        <DiaryPhotoPicker onChange={setPhotoUri} photoUri={photoUri} />
        <Text style={styles.label}>제목</Text>
        <TextInput onChangeText={setTitle} placeholder="오늘의 기억" placeholderTextColor={colors.textMuted} style={styles.input} value={title} />
        <Text style={styles.label}>기록</Text>
        <TextInput multiline onChangeText={setSummary} placeholder="이 장소에서의 기억을 남겨 보세요." placeholderTextColor={colors.textMuted} style={[styles.input, styles.summary]} textAlignVertical="top" value={summary} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  cancel: { color: colors.textMuted, fontSize: 15 },
  save: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  content: { padding: spacing.lg },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md },
  locations: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  locationChip: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  locationChipSelected: { backgroundColor: colors.primary },
  locationText: { color: colors.text, fontWeight: '600' },
  locationTextSelected: { color: colors.surface },
  input: { backgroundColor: colors.surface, borderRadius: 14, color: colors.text, elevation: 1, fontFamily: colors.fontFamily, fontSize: 16, padding: spacing.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  summary: { minHeight: 150 },
});
