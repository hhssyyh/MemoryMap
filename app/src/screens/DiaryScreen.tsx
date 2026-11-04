import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollectionCard } from '../components/CollectionCard';
import { DiaryListItem } from '../components/DiaryListItem';
import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { useDiaries } from '../context/DiaryContext';
import { SQLiteCollectionRepository } from '../data/SQLiteCollectionRepository';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { DiaryCollection } from '../types/collection';
import { ThemedText as Text } from '../components/ThemedText';

const collectionRepository = new SQLiteCollectionRepository();

export function DiaryScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { points } = useDiaries();
  const [collections, setCollections] = useState<DiaryCollection[]>([]);
  const [showAllDiaries, setShowAllDiaries] = useState(false);
  const diaryItems = useMemo(
    () =>
      points
        .flatMap((point) =>
          point.diaries.map((diary) => ({ diary, location: point.location })),
        )
        .sort((a, b) => b.diary.date.localeCompare(a.diary.date)),
    [points],
  );
  const displayedDiaryItems = showAllDiaries ? diaryItems : diaryItems.slice(0, 5);
  const displayedTitle = showAllDiaries ? '전체 기록' : '최근 기록';

  const refreshCollections = useCallback(async () => {
    const nextCollections = await collectionRepository.listCollections();
    setCollections(nextCollections);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCollections();
    }, [refreshCollections]),
  );

  const openCollection = (collection: DiaryCollection) => {
    setShowAllDiaries(false);
    navigation.navigate('CollectionDetail', { collectionId: collection.id });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MY DIARY</Text>
        <Text style={styles.title}>나의 기록</Text>
        <Text style={styles.count}>{collections.length}개의 모음집, {diaryItems.length}개의 추억</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>모음집</Text>
          <Pressable
            accessibilityLabel="전체 기록 보기"
            accessibilityRole="button"
            onPress={() => {
              setShowAllDiaries(true);
            }}
            style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
          >
            <Text style={styles.textButtonLabel}>전체 보기</Text>
          </Pressable>
        </View>

        {collections.length ? (
          <ScrollView
            contentContainerStyle={styles.collectionList}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {collections.map((collection) => (
              <CollectionCard
                collection={collection}
                key={collection.id}
                onPress={() => openCollection(collection)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>모음집 없음</Text>
            <Text style={styles.emptyText}>새 기록을 만들면 모음집으로 정리할 수 있어요.</Text>
          </View>
        )}

        <View style={[styles.sectionHeader, styles.diarySectionHeader]}>
          <View>
            <Text style={styles.sectionTitle}>{displayedTitle}</Text>
            <Text style={styles.sectionCount}>{displayedDiaryItems.length}개의 기록</Text>
          </View>
        </View>

        <View style={styles.diaryList}>
          {displayedDiaryItems.map((item) => (
            <DiaryListItem
              diary={item.diary}
              key={item.diary.id}
              location={item.location}
              onPress={() =>
                navigation.navigate('DiaryDetail', {
                  diary: item.diary,
                  location: item.location,
                })
              }
            />
          ))}
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: spacing.xl * 3,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  textButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  textButtonLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  collectionList: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  diarySectionHeader: {
    marginTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  diaryList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  emptyPanel: {
    backgroundColor: 'rgba(255, 253, 253, 0.76)',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  addButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 28, bottom: spacing.lg, elevation: 6, height: 56, justifyContent: 'center', position: 'absolute', right: spacing.lg, width: 56 },
  addButtonText: { color: colors.surface, fontSize: 32, lineHeight: 34 },
});
