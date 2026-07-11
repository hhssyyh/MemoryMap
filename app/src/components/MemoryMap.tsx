import { useEffect, useMemo, useRef } from 'react';
import { Image as RNImage, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Mapbox from '@rnmapbox/maps';

import { colors } from '../constants/theme';
import type { CurrentCoordinate } from '../hooks/useCurrentLocation';
import { useMapLightPreset } from '../hooks/useMapLightPreset';
import type { DiaryPoint } from '../types/diary';

type MemoryMapProps = {
  points: DiaryPoint[];
  highlightedPointId?: string;
  onSelectPoint?: (point: DiaryPoint) => void;
  onOpenDiaries: (point: DiaryPoint) => void;
  expanded?: boolean;
  onExpand?: () => void;
  topInset?: number;
  currentLocation: CurrentCoordinate | null;
  isLocating: boolean;
  onRequestLocation: () => Promise<void>;
};

const initialCenter: [number, number] = [127.053, 37.5385];
const standardStyleURL = 'mapbox://styles/mapbox/standard';
const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

type MarkerProperties = {
  imageName: string;
  pointId: string;
  selected: boolean;
};

type ShapePressEvent = {
  features: GeoJSON.Feature[];
};

function createMarkerCollection(
  points: DiaryPoint[],
  selectedPointId: string,
): GeoJSON.FeatureCollection<GeoJSON.Point, MarkerProperties> {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature',
      id: point.id,
      geometry: {
        type: 'Point',
        coordinates: [point.coordinate.longitude, point.coordinate.latitude],
      },
      properties: {
        imageName: `memory-photo-${point.id}`,
        pointId: point.id,
        selected: point.id === selectedPointId,
      },
    })),
  };
}

function createDailyRouteCollection(
  points: DiaryPoint[],
): GeoJSON.FeatureCollection<GeoJSON.LineString, { date: string }> {
  const coordinatesByDate = new Map<string, [number, number][]>();

  points.forEach((point) => {
    const datesAtPoint = new Set(point.diaries.map((diary) => diary.date));

    datesAtPoint.forEach((date) => {
      const coordinates = coordinatesByDate.get(date) ?? [];
      coordinates.push([
        point.coordinate.longitude,
        point.coordinate.latitude,
      ]);
      coordinatesByDate.set(date, coordinates);
    });
  });

  return {
    type: 'FeatureCollection',
    features: Array.from(coordinatesByDate.entries())
      .filter(([, coordinates]) => coordinates.length >= 2)
      .map(([date, coordinates]) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: { date },
      })),
  };
}

if (accessToken) {
  void Mapbox.setAccessToken(accessToken);
}

export function MemoryMap({
  points,
  highlightedPointId,
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
  const markerSourceRef = useRef<Mapbox.ShapeSource>(null);
  const lightPreset = useMapLightPreset();
  const markerCollection = useMemo(
    () => createMarkerCollection(points, highlightedPointId ?? ''),
    [highlightedPointId, points],
  );
  const dailyRouteCollection = useMemo(
    () => createDailyRouteCollection(points),
    [points],
  );

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

  const handleMarkerPress = async (event: ShapePressEvent) => {
    const feature = event.features[0];

    if (!feature) {
      return;
    }

    if (feature.properties?.cluster) {
      const zoomLevel = await markerSourceRef.current?.getClusterExpansionZoom(
        feature,
      );

      if (feature.geometry.type === 'Point' && zoomLevel !== undefined) {
        cameraRef.current?.setCamera({
          animationDuration: 500,
          animationMode: 'easeTo',
          centerCoordinate: feature.geometry.coordinates as [number, number],
          zoomLevel,
        });
      }
      return;
    }

    const point = points.find(
      (candidate) => candidate.id === feature.properties?.pointId,
    );

    if (point) {
      cameraRef.current?.setCamera({
        animationDuration: 550,
        animationMode: 'easeTo',
        centerCoordinate: [
          point.coordinate.longitude,
          point.coordinate.latitude,
        ],
        zoomLevel: 14,
      });
      onSelectPoint?.(point);
      onOpenDiaries(point);
    }
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
        styleURL={standardStyleURL}
      >
        <Mapbox.StyleImport
          config={{ lightPreset }}
          existing
          id="basemap"
        />
        <Mapbox.Camera
          defaultSettings={{ centerCoordinate: initialCenter, zoomLevel: 12.5 }}
          ref={cameraRef}
        />

        <Mapbox.Images>
          {points.map((point) => {
            const diary = point.diaries[0];

            return (
              <Mapbox.Image
                key={point.id}
                name={`memory-photo-${point.id}`}
              >
                <View collapsable={false} style={styles.photoMarkerCanvas}>
                  <View style={styles.photoFrame}>
                    {diary?.photoUri ? (
                      <RNImage
                        resizeMode="cover"
                        source={{ uri: diary.photoUri }}
                        style={styles.photo}
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoPlaceholderText}>사진 없음</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.photoPointer} />
                </View>
              </Mapbox.Image>
            );
          })}
        </Mapbox.Images>

        <Mapbox.ShapeSource id="daily-routes" shape={dailyRouteCollection}>
          <Mapbox.LineLayer
            id="daily-route-lines"
            style={{
              lineCap: 'round',
              lineColor: colors.accent,
              lineJoin: 'round',
              lineOpacity: 0.72,
              lineWidth: 4,
            }}
          />
        </Mapbox.ShapeSource>

        <Mapbox.ShapeSource
          cluster
          clusterMaxZoomLevel={13}
          clusterRadius={48}
          id="memory-markers"
          onPress={(event) => void handleMarkerPress(event)}
          ref={markerSourceRef}
          shape={markerCollection}
        >
          <Mapbox.CircleLayer
            filter={['has', 'point_count']}
            id="memory-clusters"
            style={{
              circleColor: colors.primary,
              circleRadius: [
                'step',
                ['get', 'point_count'],
                22,
                10,
                27,
                30,
                32,
              ],
              circleStrokeColor: colors.surface,
              circleStrokeWidth: 3,
            }}
          />
          <Mapbox.SymbolLayer
            filter={['has', 'point_count']}
            id="memory-cluster-counts"
            style={{
              textAllowOverlap: true,
              textColor: colors.surface,
              textField: ['get', 'point_count_abbreviated'],
              textSize: 13,
            }}
          />
          <Mapbox.CircleLayer
            filter={['!', ['has', 'point_count']]}
            id="memory-marker-backgrounds"
            style={{
              circleColor: colors.accent,
              circleOpacity: [
                'case',
                ['==', ['get', 'selected'], true],
                0.24,
                0,
              ],
              circleRadius: [
                'case',
                ['==', ['get', 'selected'], true],
                28,
                0,
              ],
            }}
          />
          <Mapbox.SymbolLayer
            filter={['!', ['has', 'point_count']]}
            id="memory-marker-photos"
            style={{
              iconAllowOverlap: true,
              iconAnchor: 'bottom',
              iconIgnorePlacement: true,
              iconImage: ['get', 'imageName'],
              iconSize: [
                'case',
                ['==', ['get', 'selected'], true],
                1.08,
                0.92,
              ],
            }}
          />
        </Mapbox.ShapeSource>

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
  photoMarkerCanvas: {
    alignItems: 'center',
    height: 66,
    padding: 3,
    width: 58,
  },
  photoFrame: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
    borderRadius: 7,
    borderWidth: 3,
    elevation: 5,
    height: 52,
    overflow: 'hidden',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 4,
    width: 52,
  },
  photo: {
    height: '100%',
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    flex: 1,
    justifyContent: 'center',
  },
  photoPlaceholderText: { color: colors.textMuted, fontSize: 8 },
  photoPointer: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
    borderRightColor: 'transparent',
    borderRightWidth: 7,
    borderTopColor: colors.surface,
    borderTopWidth: 10,
    height: 0,
    marginTop: -1,
    width: 0,
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
