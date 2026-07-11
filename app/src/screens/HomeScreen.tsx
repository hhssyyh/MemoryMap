import { useState } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiaryListModal } from '../components/DiaryListModal';
import { FullscreenMapModal } from '../components/FullscreenMapModal';
import { MemoryMap } from '../components/MemoryMap';
import { colors, spacing } from '../constants/theme';
import { useDiaries } from '../context/DiaryContext';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { DiaryPoint } from '../types/diary';

export function HomeScreen() {
  const { points } = useDiaries();
  const [selectedPointId, setSelectedPointId] = useState(points[0]!.id);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [diaryListPoint, setDiaryListPoint] = useState<DiaryPoint | null>(null);
  const currentLocation = useCurrentLocation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const selectedPoint = points.find((point) => point.id === selectedPointId) ?? points[0]!;
  const latestDiary = selectedPoint.diaries[0]!;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MEMORY MAP</Text>
            <Text style={styles.title}>나의 추억 지도</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.count}>{points.length}</Text>
            <Text style={styles.countLabel}>곳</Text>
          </View>
        </View>

        <MemoryMap
          currentLocation={currentLocation.coordinate}
          highlightedPointId={diaryListPoint?.id}
          isLocating={currentLocation.isLocating}
          onExpand={() => setIsMapExpanded(true)}
          onOpenDiaries={setDiaryListPoint}
          onSelectPoint={(point) => setSelectedPointId(point.id)}
          onRequestLocation={currentLocation.requestLocation}
          points={points}
        />

        <View style={styles.memoryCard}>
          <View style={styles.memoryIcon}>
            {latestDiary.photoUri ? <Image source={{ uri: latestDiary.photoUri }} style={styles.memoryPhoto} /> : <Text style={styles.memoryPhotoEmpty}>사진 없음</Text>}
          </View>
          <View style={styles.memoryContent}>
            <Text style={styles.memoryLocation}>{selectedPoint.location}</Text>
            <Text numberOfLines={1} style={styles.memoryTitle}>
              {latestDiary.title}
            </Text>
            <Text style={styles.memoryDate}>{latestDiary.date}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </View>
      <FullscreenMapModal
        currentLocation={currentLocation.coordinate}
        highlightedPointId={diaryListPoint?.id}
        isLocating={currentLocation.isLocating}
        onClose={() => setIsMapExpanded(false)}
        onOpenDiaries={setDiaryListPoint}
        onSelectPoint={(point) => setSelectedPointId(point.id)}
        onRequestLocation={currentLocation.requestLocation}
        points={points}
        visible={isMapExpanded}
      />
      <DiaryListModal
        onClose={() => setDiaryListPoint(null)}
        onOpenDiary={(diary, location) => {
          setDiaryListPoint(null);
          navigation.navigate('DiaryDetail', { diary, location });
        }}
        point={diaryListPoint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    flex: 1,
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  countBadge: {
    alignItems: 'baseline',
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  count: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  countLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  memoryCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 14,
  },
  memoryIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    marginRight: 13,
    overflow: 'hidden',
    width: 56,
  },
  memoryPhoto: { height: '100%', width: '100%' },
  memoryPhotoEmpty: { color: colors.textMuted, fontSize: 9 },
  memoryContent: {
    flex: 1,
  },
  memoryLocation: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  memoryTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  memoryDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 30,
    marginLeft: spacing.sm,
  },
});
