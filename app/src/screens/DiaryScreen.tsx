import { FlatList, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiaryListItem } from '../components/DiaryListItem';
import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { useDiaries } from '../context/DiaryContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ThemedText as Text } from '../components/ThemedText';

export function DiaryScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { points } = useDiaries();
  const diaryItems = points
    .flatMap((point) => point.diaries.map((diary) => ({ diary, location: point.location })))
    .sort((a, b) => b.diary.date.localeCompare(a.diary.date));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MY DIARY</Text>
        <Text style={styles.title}>나의 기록</Text>
        <Text style={styles.count}>{diaryItems.length}개의 추억</Text>
      </View>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={diaryItems}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={({ diary }) => diary.id}
        renderItem={({ item }) => (
          <DiaryListItem
            diary={item.diary}
            location={item.location}
            onPress={() =>
              navigation.navigate('DiaryDetail', {
                diary: item.diary,
                location: item.location,
              })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />
      <Pressable accessibilityLabel="새 기록 작성" onPress={() => navigation.navigate('CreateDiary')} style={styles.addButton}>
        <Text style={styles.addButtonText}>＋</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 3,
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  addButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 28, bottom: spacing.lg, elevation: 6, height: 56, justifyContent: 'center', position: 'absolute', right: spacing.lg, width: 56 },
  addButtonText: { color: colors.surface, fontSize: 32, lineHeight: 34 },
});
