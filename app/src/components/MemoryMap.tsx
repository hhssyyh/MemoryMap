import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Mapbox from '@rnmapbox/maps';

import { colors } from '../constants/theme';
import type { CurrentCoordinate } from '../hooks/useCurrentLocation';
import type { DiaryPoint } from '../types/diary';

type MemoryMapProps = {
  points: DiaryPoint[];
  selectedPoint: DiaryPoint;
  onSelectPoint: (point: DiaryPoint) => void;
  onOpenDiaries: (point: DiaryPoint) => void;
  expanded?: boolean;
  onExpand?: () => void;
  topInset?: number;
  currentLocation: CurrentCoordinate | null;
  isLocating: boolean;
  onRequestLocation: () => Promise<void>;
};

const initialCenter: [number, number] = [127.053, 37.5385];
const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (accessToken) {
  void Mapbox.setAccessToken(accessToken);
}

export function MemoryMap({
  points,
  selectedPoint,
  onSelectPoint,
  onOpenDiaries,
  expanded = false,
  onExpand,
  topInset = 0,
  currentLocation,
  isLocating,
  onRequestLocation,
}: MemoryMapProps) {
  const cameraRef = useRef<Mapbox.Camera>(null);

  useEffect(() => {
    if (currentLocation) {
      cameraRef.current?.setCamera({
        animationDuration: 600,
        animationMode: 'flyTo',
        centerCoordinate: [
          currentLocation.longitude,
          currentLocation.latitude,
        ],
        zoomLevel: 15,
      });
    }
  }, [currentLocation]);

  const fitAllPoints = () => {
    if (points.length === 0) {
      return;
    }

    const longitudes = points.map((point) => point.coordinate.longitude);
    const latitudes = points.map((point) => point.coordinate.latitude);

    cameraRef.current?.fitBounds(
      [Math.max(...longitudes), Math.max(...latitudes)],
      [Math.min(...longitudes), Math.min(...latitudes)],
      [70, 45, 70, 45],
      600,
    );
  };

  if (!accessToken) {
    return (
      <View style={[styles.container, styles.configurationError]}>
        <Text style={styles.configurationErrorTitle}>Mapbox 설정 필요</Text>
        <Text style={styles.configurationErrorText}>
          EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN을 확인해 주세요.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <Mapbox.MapView
        compassEnabled={false}
        logoEnabled
        pitchEnabled={false}
        rotateEnabled={false}
        scaleBarEnabled={false}
        style={StyleSheet.absoluteFill}
        styleURL={Mapbox.StyleURL.Street}
      >
        <Mapbox.Camera
          defaultSettings={{ centerCoordinate: initialCenter, zoomLevel: 12.5 }}
          ref={cameraRef}
        />

        {points.map((point) => (
          <Mapbox.PointAnnotation
            coordinate={[
              point.coordinate.longitude,
              point.coordinate.latitude,
            ]}
            id={point.id}
            key={point.id}
            onSelected={() => {
              onSelectPoint(point);
              onOpenDiaries(point);
            }}
          >
            <View
              style={[
                styles.marker,
                point.id === selectedPoint.id && styles.markerSelected,
              ]}
            >
              <Text style={styles.markerEmoji}>
                {point.diaries[0]?.emoji ?? '📍'}
              </Text>
            </View>
          </Mapbox.PointAnnotation>
        ))}

        {currentLocation ? (
          <Mapbox.PointAnnotation
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
            id="current-location"
          >
            <View style={styles.currentLocationMarker} />
          </Mapbox.PointAnnotation>
        ) : null}
      </Mapbox.MapView>

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
        accessibilityLabel="현재 위치로 이동"
        accessibilityRole="button"
        disabled={isLocating}
        onPress={() => void onRequestLocation()}
        style={({ pressed }) => [
          styles.locationButton,
          (pressed || isLocating) && styles.controlButtonPressed,
        ]}
      >
        <Text style={styles.locationButtonIcon}>{isLocating ? '…' : '◎'}</Text>
      </Pressable>

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

const controlButton = {
  alignItems: 'center',
  backgroundColor: colors.surface,
  elevation: 4,
  justifyContent: 'center',
  position: 'absolute',
  right: 16,
  shadowColor: colors.text,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.16,
  shadowRadius: 4,
} as const;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.map,
    borderRadius: 28,
    flex: 1,
    minHeight: 390,
    overflow: 'hidden',
    position: 'relative',
  },
  configurationError: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  configurationErrorText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  configurationErrorTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  containerExpanded: {
    borderRadius: 0,
    minHeight: 0,
  },
  currentLocationMarker: {
    backgroundColor: '#2D7FF9',
    borderColor: colors.surface,
    borderRadius: 10,
    borderWidth: 3,
    height: 20,
    width: 20,
  },
  marker: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 20,
    borderWidth: 3,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  markerEmoji: {
    fontSize: 20,
  },
  markerSelected: {
    borderColor: colors.accent,
    transform: [{ scale: 1.12 }],
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
    ...controlButton,
    borderRadius: 22,
    bottom: 18,
    height: 44,
    width: 44,
  },
  locationButton: {
    ...controlButton,
    borderRadius: 22,
    bottom: 70,
    height: 44,
    width: 44,
  },
  expandButton: {
    ...controlButton,
    borderRadius: 20,
    height: 40,
    right: 14,
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
  locationButtonIcon: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
  },
});
