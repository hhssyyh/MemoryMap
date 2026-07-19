import { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Pressable, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiaryListItem } from '../components/DiaryListItem';
import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { useDiaries } from '../context/DiaryContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ThemedText as Text } from '../components/ThemedText';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchDiary'>;

const normalizeTag = (value: string) => value.trim().replace(/^#\s*/, '').toLocaleLowerCase();

export function SearchDiaryScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { points } = useDiaries();
  const [query, setQuery] = useState(route.params?.tag ?? '');

  useEffect(() => {
    if (route.params?.tag) setQuery(route.params.tag);
  }, [route.params?.tag]);

  const normalizedQuery = normalizeTag(query);
  const results = useMemo(
    () => points
      .flatMap((point) => point.diaries.map((diary) => ({ diary, location: point.location })))
      .filter(({ diary }) => normalizedQuery.length === 0 || diary.tags?.some((tag) => normalizeTag(tag) === normalizedQuery))
      .sort((a, b) => b.diary.date.localeCompare(a.diary.date)),
    [normalizedQuery, points],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>SEARCH MEMORIES</Text>
          <Text style={styles.title}>태그로 검색</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="다이어리 태그 검색"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="#맛집"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
        {query ? (
          <Pressable accessibilityLabel="검색어 지우기" hitSlop={8} onPress={() => setQuery('')}>
            <Text style={styles.clearIcon}>×</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={results}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={({ diary }) => diary.id}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{query ? '일치하는 기록이 없어요' : '태그를 입력해 보세요'}</Text>
            <Text style={styles.emptyText}>예: #맛집, #여행</Text>
          </View>
        )}
        ListHeaderComponent={(
          <Text style={styles.resultCount}>
            {normalizedQuery ? `#${normalizedQuery} · ${results.length}개의 기록` : `총 ${results.length}개의 기록`}
          </Text>
        )}
        renderItem={({ item }) => (
          <DiaryListItem
            diary={item.diary}
            location={item.location}
            onPress={() => navigation.navigate('DiaryDetail', item)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  backButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  backIcon: { color: colors.text, fontSize: 34, lineHeight: 36, marginTop: -3 },
  heading: { marginLeft: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', marginTop: 2 },
  searchWrap: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.lg, paddingHorizontal: spacing.md },
  searchIcon: { color: colors.primary, fontSize: 25, marginRight: spacing.sm },
  input: { color: colors.text, flex: 1, fontSize: 16, height: 52 },
  clearIcon: { color: colors.textMuted, fontSize: 27, lineHeight: 30 },
  listContent: { flexGrow: 1, paddingBottom: spacing.xl, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  resultCount: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  separator: { height: spacing.sm },
  empty: { alignItems: 'center', paddingTop: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
