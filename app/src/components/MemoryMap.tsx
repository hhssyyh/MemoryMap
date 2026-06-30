import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { memoryMapStyle } from '../constants/mapStyle';
import { colors } from '../constants/theme';
import type { DiaryPoint } from '../types/diary';

type MemoryMapProps = {
  points: DiaryPoint[];
  selectedPoint: DiaryPoint;
  onSelectPoint: (point: DiaryPoint) => void;
  onOpenDiaries: (point: DiaryPoint) => void;
  expanded?: boolean;
  onExpand?: () => void;
  topInset?: number;
};

const initialRegion = {
  latitude: 37.5385,
  longitude: 127.053,
  latitudeDelta: 0.04,
  longitudeDelta: 0.05,
};

export function MemoryMap({
  points,
  selectedPoint,
  onSelectPoint,
  onOpenDiaries,
  expanded = false,
  onExpand,
  topInset = 0,
}: MemoryMapProps) {
  const mapRef = useRef<MapView>(null);

  const fitAllPoints = () => {
    mapRef.current?.fitToCoordinates(
      points.map((point) => point.coordinate),
      {
        animated: true,
        edgePadding: { top: 70, right: 45, bottom: 70, left: 45 },
      },
    );
  };

  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <MapView
        ref={mapRef}
        customMapStyle={memoryMapStyle}
        initialRegion={initialRegion}
        loadingBackgroundColor={colors.background}
        loadingEnabled
        loadingIndicatorColor={colors.primary}
        mapPadding={{ top: 40 + topInset, right: 0, bottom: 12, left: 0 }}
        mapType="standard"
        moveOnMarkerPress={false}
        provider={PROVIDER_GOOGLE}
        rotateEnabled={false}
        showsBuildings={false}
        showsCompass
        showsPointsOfInterest
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
      >
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={point.coordinate}
            description={`${point.diaries.length}개의 기록 · 눌러서 보기`}
            identifier={point.id}
            onCalloutPress={() => onOpenDiaries(point)}
            onPress={() => onSelectPoint(point)}
            pinColor={
              point.id === selectedPoint.id ? colors.accent : colors.primary
            }
            title={`${point.diaries[0]?.emoji ?? '📍'} ${point.location}`}
          />
        ))}
      </MapView>

      <View
        pointerEvents="none"
        style={[styles.mapBadge, { top: 14 + topInset }]}
      >
        <Text style={styles.mapBadgeText}>{points.length} MEMORIES</Text>
      </View>

      {onExpand ? (
        <Pressable
          accessibilityLabel="지도를 전체화면으로 보기"
          accessibilityRole="button"
          onPress={onExpand}
          style={({ pressed }) => [
            styles.expandButton,
            { top: 14 + topInset },
            pressed && styles.controlButtonPressed,
          ]}
        >
          <Text style={styles.expandButtonIcon}>⛶</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="모든 추억 위치 보기"
        accessibilityRole="button"
        onPress={fitAllPoints}
        style={({ pressed }) => [
          styles.fitButton,
          pressed && styles.controlButtonPressed,
        ]}
      >
        <Text style={styles.fitButtonIcon}>⌖</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.map,
    borderRadius: 28,
    flex: 1,
    minHeight: 390,
    overflow: 'hidden',
    position: 'relative',
  },
  containerExpanded: {
    borderRadius: 0,
    minHeight: 0,
  },
  mapBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    left: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: 'absolute',
  },
  mapBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  fitButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    bottom: 18,
    elevation: 4,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    width: 44,
  },
  expandButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    elevation: 4,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    width: 40,
  },
  controlButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  expandButtonIcon: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  fitButtonIcon: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: '700',
  },
});
