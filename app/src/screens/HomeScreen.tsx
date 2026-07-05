import { useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiaryListModal } from '../components/DiaryListModal';
import { FullscreenMapModal } from '../components/FullscreenMapModal';
import { MemoryMap } from '../components/MemoryMap';
import { sampleDiaryPoints } from '../constants/sampleDiaryPoints';
import { colors, spacing } from '../constants/theme';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import type { DiaryPoint } from '../types/diary';

const initialPoint = sampleDiaryPoints[0]!;

export function HomeScreen() {
  const [selectedPoint, setSelectedPoint] = useState<DiaryPoint>(initialPoint);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [diaryListPoint, setDiaryListPoint] = useState<DiaryPoint | null>(null);
  const currentLocation = useCurrentLocation();
  const insets = useSafeAreaInsets();
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
            <Text style={styles.count}>{sampleDiaryPoints.length}</Text>
            <Text style={styles.countLabel}>곳</Text>
          </View>
        </View>

        <MemoryMap
          currentLocation={currentLocation.coordinate}
          isLocating={currentLocation.isLocating}
          onExpand={() => setIsMapExpanded(true)}
          onOpenDiaries={setDiaryListPoint}
          onSelectPoint={setSelectedPoint}
          onRequestLocation={currentLocation.requestLocation}
          points={sampleDiaryPoints}
          selectedPoint={selectedPoint}
        />

        <View style={styles.memoryCard}>
          <View style={styles.memoryIcon}>
            <Text style={styles.memoryEmoji}>{latestDiary.emoji}</Text>
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
        isLocating={currentLocation.isLocating}
        onClose={() => setIsMapExpanded(false)}
        onOpenDiaries={setDiaryListPoint}
        onSelectPoint={setSelectedPoint}
        onRequestLocation={currentLocation.requestLocation}
        points={sampleDiaryPoints}
        selectedPoint={selectedPoint}
        visible={isMapExpanded}
      />
      <DiaryListModal
        onClose={() => setDiaryListPoint(null)}
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
    width: 56,
  },
  memoryEmoji: {
    fontSize: 27,
  },
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
