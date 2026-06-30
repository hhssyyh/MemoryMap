import { FlatList, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiaryListItem } from '../components/DiaryListItem';
import { sampleDiaryPoints } from '../constants/sampleDiaryPoints';
import { colors, spacing } from '../constants/theme';

const diaryItems = sampleDiaryPoints
  .flatMap((point) =>
    point.diaries.map((diary) => ({ diary, location: point.location })),
  )
  .sort((a, b) => b.diary.date.localeCompare(a.diary.date));

export function DiaryScreen() {
  const insets = useSafeAreaInsets();

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
        ItemSeparatorComponent={ItemSeparator}
        keyExtractor={({ diary }) => diary.id}
        renderItem={({ item }) => (
          <DiaryListItem diary={item.diary} location={item.location} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
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
});
