import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, View, type DimensionValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing, type ThemeColors } from '../constants/theme';
import { useDiaries } from '../context/DiaryContext';
import { useAppTheme } from '../context/ThemeContext';
import { ThemedText as Text } from '../components/ThemedText';

const mapImageUri = 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1400&auto=format&fit=crop';
const featuredImageUri = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop';
const homeBackground = require('../../assets/home_paris.jpg');
const backgroundWashOpacity = 0.25;
const elevatedCardOpacity = 'CC';

const quickActions = [
  { icon: '📷', label: '사진 기록' },
  { icon: '📘', label: '다이어리' },
  { icon: '🧳', label: '여행 일정' },
  { icon: '🪧', label: '장소 탐색' },
  { icon: '⭐', label: '추천 장소' },
];

const nearbyPins: { image: string; left: DimensionValue; top: DimensionValue }[] = [
  { image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=300&auto=format&fit=crop', left: '18%', top: '44%' },
  { image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=300&auto=format&fit=crop', left: '42%', top: '14%' },
  { image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=300&auto=format&fit=crop', left: '58%', top: '64%' },
  { image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=300&auto=format&fit=crop', left: '78%', top: '38%' },
];

const cardShadow = (colors: ThemeColors, opacity = 0.14, radius = 16, elevation = 6) => ({
  elevation,
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: opacity,
  shadowRadius: radius,
});

const translucentSurface = (colors: ThemeColors) => `${colors.surface}${elevatedCardOpacity}`;

export function Home2Screen() {
  const { colors } = useAppTheme();
  const { points } = useDiaries();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const diaries = points.flatMap((point) => point.diaries.map((diary) => ({ diary, location: point.location })));
  const featured = diaries[0];
  const recent = diaries.slice(0, 5);

  return (
    <ImageBackground resizeMode="cover" source={homeBackground} style={styles.screen}>
      <View pointerEvents="none" style={styles.backgroundWash} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Good morning, 🌊</Text>
            <Text style={styles.greeting}>승연님, 좋은 아침이에요!</Text>
            <Text style={styles.subtitle}>오늘도 멋진 하루의 추억을 남겨보세요.</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="검색" style={styles.circleButton}>
              <Text style={styles.circleIcon}>⌕</Text>
            </Pressable>
            <Pressable accessibilityLabel="알림" style={styles.circleButton}>
              <Text style={styles.circleIcon}>♢</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>▣ 오늘의 날씨</Text>
            <Text style={styles.summaryValue}>24°C <Text style={styles.summarySmall}>맑음</Text></Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>⌖ 내가 기록한 장소</Text>
            <Text style={styles.summaryValue}>{points.length + 34} <Text style={styles.summarySmall}>곳</Text></Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>▤ 추억의 기록</Text>
            <Text style={styles.summaryValue}>{diaries.length + 122} <Text style={styles.summarySmall}>개</Text></Text>
          </View>
          <View style={styles.summaryArrow}>
            <Text style={styles.summaryArrowText}>›</Text>
          </View>
        </View>

        <ImageBackground imageStyle={styles.mapImage} source={{ uri: mapImageUri }} style={styles.mapCard}>
          <View style={styles.mapWash} />
          <View style={styles.currentLocationOuter}>
            <View style={styles.currentLocationInner} />
          </View>
          {nearbyPins.map((pin) => (
            <View key={`${pin.left}-${pin.top}`} style={[styles.mapPin, { left: pin.left, top: pin.top }]}>
              <Image source={{ uri: pin.image }} style={styles.mapPinImage} />
              <View style={styles.pinTail} />
            </View>
          ))}
          <Pressable accessibilityLabel="현재 위치 보기" style={styles.compassButton}>
            <Text style={styles.compassIcon}>⌁</Text>
          </Pressable>
          <View style={styles.nearbyCard}>
            <View style={styles.nearbyIcon}>
              <Text style={styles.nearbyIconText}>▣</Text>
            </View>
            <View style={styles.nearbyCopy}>
              <Text style={styles.nearbyTitle}>근처에 3개의 추억이 있어요</Text>
              <Text style={styles.nearbyText}>가까운 추억을 확인해보세요!</Text>
            </View>
            <Text style={styles.nearbyArrow}>›</Text>
          </View>
        </ImageBackground>

        {featured ? (
          <View style={styles.featuredCard}>
            <View style={styles.sectionHeaderCompact}>
              <Text style={styles.sectionTitle}>☆ 오늘의 추억</Text>
              <Text style={styles.bookmark}>♡</Text>
            </View>
            <View style={styles.featuredBody}>
              <Image source={{ uri: featured.diary.photoUri || featuredImageUri }} style={styles.featuredImage} />
              <View style={styles.featuredCopy}>
                <Text style={styles.locationText}>⌖ {featured.location}</Text>
                <Text style={styles.featuredTitle}>{featured.diary.title}</Text>
                <Text numberOfLines={2} style={styles.featuredSummary}>“{featured.diary.summary}”</Text>
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>{featured.diary.date}</Text>
                  <Text style={styles.ageBadge}>2년 전</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.quickRow}>
          {quickActions.map((action) => (
            <Pressable accessibilityLabel={action.label} key={action.label} style={styles.quickButton}>
              <Text style={styles.quickIcon}>{action.icon}</Text>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>♡ 최근 기록</Text>
          <Text style={styles.seeAll}>전체 보기 ›</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.recentRow}>
            {recent.map(({ diary, location }) => (
              <View key={diary.id} style={styles.recentCard}>
                <Image source={{ uri: diary.photoUri || featuredImageUri }} style={styles.recentImage} />
                <View style={styles.recentCopy}>
                  <Text numberOfLines={1} style={styles.recentTitle}>{diary.title}</Text>
                  <Text numberOfLines={1} style={styles.recentLocation}>{location}</Text>
                  <Text style={styles.recentDate}>{diary.date}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </ImageBackground>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  backgroundWash: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, opacity: backgroundWashOpacity },
  content: { paddingHorizontal: spacing.lg },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: colors.primary, fontFamily: 'serif', fontSize: 22, fontStyle: 'italic', fontWeight: '600' },
  greeting: { color: colors.text, fontSize: 28, fontWeight: '800', lineHeight: 36, marginTop: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 16, fontWeight: '600', marginTop: spacing.xs },
  headerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  circleButton: { alignItems: 'center', height: 56, justifyContent: 'center', width: 56 },
  circleIcon: { color: '#FFFFFF', fontSize: 30, lineHeight: 32, textShadowColor: 'rgba(35, 22, 27, 0.72)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  summaryCard: { alignItems: 'center', backgroundColor: translucentSurface(colors), borderColor: `${colors.surfaceRaised}CC`, borderRadius: 24, borderWidth: 1, flexDirection: 'row', marginTop: spacing.xl, minHeight: 118, padding: spacing.md, ...cardShadow(colors, 0.16, 18, 8) },
  summaryItem: { flex: 1, gap: spacing.sm },
  summaryLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  summaryValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  summarySmall: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  divider: { backgroundColor: colors.border, height: 58, marginHorizontal: spacing.sm, width: 1 },
  summaryArrow: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: `${colors.primary}22`, borderRadius: 24, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  summaryArrowText: { color: colors.primary, fontSize: 32, lineHeight: 34 },
  mapCard: { borderColor: `${colors.surfaceRaised}CC`, borderRadius: 26, borderWidth: 1, height: 360, justifyContent: 'flex-end', marginTop: spacing.lg, overflow: 'hidden', padding: spacing.md, ...cardShadow(colors, 0.2, 22, 10) },
  mapImage: { borderRadius: 26 },
  mapWash: { ...StyleSheet.absoluteFillObject, backgroundColor: `${colors.map}22` },
  currentLocationOuter: { alignItems: 'center', alignSelf: 'center', backgroundColor: `${colors.secondary}33`, borderRadius: 38, height: 76, justifyContent: 'center', position: 'absolute', top: '44%', width: 76 },
  currentLocationInner: { backgroundColor: colors.secondary, borderColor: colors.surface, borderRadius: 11, borderWidth: 4, height: 22, width: 22 },
  mapPin: { alignItems: 'center', position: 'absolute' },
  mapPinImage: { borderColor: colors.surface, borderRadius: 28, borderWidth: 4, height: 56, width: 56 },
  pinTail: { backgroundColor: colors.surface, borderRadius: 5, height: 10, marginTop: -2, transform: [{ rotate: '45deg' }], width: 10 },
  compassButton: { alignItems: 'center', height: 48, justifyContent: 'center', position: 'absolute', right: spacing.md, top: spacing.md, width: 48 },
  compassIcon: { color: '#FFFFFF', fontSize: 27, lineHeight: 29, textShadowColor: 'rgba(35, 22, 27, 0.72)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5, transform: [{ rotate: '-25deg' }] },
  nearbyCard: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: translucentSurface(colors), borderColor: `${colors.surfaceRaised}DD`, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, maxWidth: '58%', padding: spacing.sm, ...cardShadow(colors, 0.13, 12, 5) },
  nearbyIcon: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 18, height: 36, justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, width: 36 },
  nearbyIconText: { color: colors.surface, fontSize: 15 },
  nearbyCopy: { flex: 1 },
  nearbyTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  nearbyText: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  nearbyArrow: { color: colors.textMuted, fontSize: 30, lineHeight: 30 },
  featuredCard: { backgroundColor: translucentSurface(colors), borderColor: `${colors.surfaceRaised}CC`, borderRadius: 24, borderWidth: 1, marginTop: spacing.lg, padding: spacing.md, ...cardShadow(colors, 0.17, 18, 8) },
  sectionHeaderCompact: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  bookmark: { color: colors.primary, fontSize: 28, lineHeight: 30 },
  featuredBody: { flexDirection: 'row', gap: spacing.md },
  featuredImage: { borderRadius: 16, flex: 1.1, height: 156 },
  featuredCopy: { flex: 1, justifyContent: 'center' },
  locationText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  featuredTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: spacing.xs },
  featuredSummary: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  dateRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dateText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  ageBadge: { backgroundColor: colors.primarySoft, borderColor: `${colors.primary}22`, borderRadius: 10, borderWidth: 1, color: colors.textMuted, fontSize: 12, fontWeight: '800', paddingHorizontal: spacing.sm, paddingVertical: 3 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  quickButton: { alignItems: 'center', backgroundColor: translucentSurface(colors), borderColor: `${colors.surfaceRaised}CC`, borderRadius: radii.xl, borderWidth: 1, height: 98, justifyContent: 'center', width: '18%', ...cardShadow(colors, 0.13, 14, 6) },
  quickIcon: { fontSize: 28 },
  quickLabel: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: spacing.sm, textAlign: 'center' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  seeAll: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  recentRow: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.sm },
  recentCard: { backgroundColor: colors.surface, borderColor: `${colors.surfaceRaised}CC`, borderRadius: 16, borderWidth: 1, overflow: 'hidden', width: 150, ...cardShadow(colors, 0.14, 14, 6) },
  recentImage: { height: 120, width: '100%' },
  recentCopy: { padding: spacing.sm },
  recentTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  recentLocation: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  recentDate: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
