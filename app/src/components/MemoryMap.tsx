import { useEffect, useMemo, useRef, useState } from "react";
import { Image as RNImage, Pressable, StyleSheet, View } from "react-native";
import * as Mapbox from "@rnmapbox/maps";

import type { ThemeColors } from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";
import type { CurrentCoordinate } from "../hooks/useCurrentLocation";
import type { DiaryPoint } from "../types/diary";
import { ThemedText as Text } from "./ThemedText";

type MemoryMapProps = {
  points: DiaryPoint[];
  compact?: boolean;
  focusCoordinate?: CurrentCoordinate;
  highlightedPointId?: string;
  onSelectPoint?: (point: DiaryPoint) => void;
  onOpenDiaries?: (point: DiaryPoint) => void;
  expanded?: boolean;
  onExpand?: () => void;
  topInset?: number;
  currentLocation: CurrentCoordinate | null;
  isLocating: boolean;
  onRequestLocation: () => Promise<void>;
};

const initialCenter: [number, number] = [127.053, 37.5385];
const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
const defaultMapStyleURL = "mapbox://styles/mapbox/standard";

function resolveMapStyleURL(themeName: string): string {
  const themeStyleURL =
    themeName === "parisDusk"
      ? process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL_PARIS_DUSK
      : themeName === "memory"
        ? process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL_MEMORY
        : themeName === "forest"
          ? process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL_FOREST
          : undefined;

  return (
    themeStyleURL?.trim() ||
    process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL?.trim() ||
    defaultMapStyleURL
  );
}

type MarkerProperties = {
  location: string;
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
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      id: point.id,
      geometry: {
        type: "Point",
        coordinates: [point.coordinate.longitude, point.coordinate.latitude],
      },
      properties: {
        location: point.location,
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
      coordinates.push([point.coordinate.longitude, point.coordinate.latitude]);
      coordinatesByDate.set(date, coordinates);
    });
  });

  return {
    type: "FeatureCollection",
    features: Array.from(coordinatesByDate.entries())
      .filter(([, coordinates]) => coordinates.length >= 2)
      .map(([date, coordinates]) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: { date },
      })),
  };
}

if (accessToken) {
  void Mapbox.setAccessToken(accessToken);
}

export function MemoryMap({
  points,
  compact = false,
  focusCoordinate,
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
  const { colors, themeName } = useAppTheme();
  const styles = createStyles(colors);
  const styleURL = resolveMapStyleURL(themeName);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const markerSourceRef = useRef<Mapbox.ShapeSource>(null);
  const previousHighlightedPointIdRef = useRef<string | undefined>(undefined);
  const markerScaleRef = useRef(1);
  const [markerScale, setMarkerScale] = useState(1);
  const [visualHighlightedPointId, setVisualHighlightedPointId] =
    useState<string>();
  const markerCollection = useMemo(
    () => createMarkerCollection(points, visualHighlightedPointId ?? ""),
    [points, visualHighlightedPointId],
  );
  const dailyRouteCollection = useMemo(
    () => createDailyRouteCollection(points),
    [points],
  );

  useEffect(() => {
    if (highlightedPointId) {
      setVisualHighlightedPointId(highlightedPointId);
    }

    const from = markerScaleRef.current;
    const to = highlightedPointId ? 1.1 : 1;
    const startedAt = Date.now();
    const duration = 220;
    let animationFrame: number;

    const animate = () => {
      const progress = Math.min((Date.now() - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextScale = from + (to - from) * eased;
      markerScaleRef.current = nextScale;
      setMarkerScale(nextScale);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else if (!highlightedPointId) {
        setVisualHighlightedPointId(undefined);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [highlightedPointId]);

  useEffect(() => {
    if (currentLocation) {
      cameraRef.current?.setCamera({
        animationDuration: 600,
        animationMode: "flyTo",
        centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
        zoomLevel: 15,
      });
    }
  }, [currentLocation]);

  useEffect(() => {
    if (!focusCoordinate) return;

    cameraRef.current?.setCamera({
      animationDuration: 0,
      centerCoordinate: [focusCoordinate.longitude, focusCoordinate.latitude],
      zoomLevel: 13,
    });
  }, [focusCoordinate]);

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

  useEffect(() => {
    if (previousHighlightedPointIdRef.current && !highlightedPointId) {
      fitAllPoints();
    }

    previousHighlightedPointIdRef.current = highlightedPointId;
  }, [highlightedPointId]);

  const openPoint = (point: DiaryPoint) => {
    cameraRef.current?.setCamera({
      animationDuration: 550,
      animationMode: "easeTo",
      centerCoordinate: [
        point.coordinate.longitude,
        point.coordinate.latitude,
      ],
      zoomLevel: 13.4,
      padding: {
        paddingBottom: expanded ? 300 : 170,
        paddingLeft: 36,
        paddingRight: 36,
        paddingTop: 72,
      },
    });
    onSelectPoint?.(point);
    onOpenDiaries?.(point);
  };

  const handleMarkerPress = async (event: ShapePressEvent) => {
    const feature = event.features[0];

    if (!feature) {
      return;
    }

    if (feature.properties?.cluster) {
      const zoomLevel =
        await markerSourceRef.current?.getClusterExpansionZoom(feature);

      if (feature.geometry.type === "Point" && zoomLevel !== undefined) {
        cameraRef.current?.setCamera({
          animationDuration: 500,
          animationMode: "easeTo",
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
      openPoint(point);
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
        pitchEnabled={!compact && false}
        rotateEnabled={false}
        scaleBarEnabled={false}
        scrollEnabled={!compact}
        style={StyleSheet.absoluteFill}
        styleURL={styleURL}
        zoomEnabled={!compact}
      >
        <Mapbox.Camera
          defaultSettings={{ centerCoordinate: initialCenter, zoomLevel: 12.5 }}
          ref={cameraRef}
        />

        <Mapbox.ShapeSource id="daily-routes" shape={dailyRouteCollection}>
          <Mapbox.LineLayer
            id="daily-route-lines"
            style={{
              lineCap: "round",
              lineColor: "#D9A5AD",
              lineJoin: "round",
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
            filter={["has", "point_count"]}
            id="memory-clusters"
            style={{
              circleColor: "#D8CFE3",
              circleRadius: [
                "step",
                ["get", "point_count"],
                22,
                10,
                27,
                30,
                32,
              ],
              circleStrokeColor: "#FFF8EE",
              circleStrokeWidth: 4,
            }}
          />
          <Mapbox.SymbolLayer
            filter={["has", "point_count"]}
            id="memory-cluster-counts"
            style={{
              textAllowOverlap: true,
              textColor: "#51485D",
              textField: [
                "concat",
                ["get", "point_count_abbreviated"],
                "\nmemories",
              ],
              textSize: 10,
            }}
          />
          <Mapbox.CircleLayer
            filter={["!", ["has", "point_count"]]}
            id="memory-marker-backgrounds"
            style={{
              circleColor: "#FFD8E0",
              circleOpacity: [
                "case",
                ["==", ["get", "selected"], true],
                0.32,
                0,
              ],
              circleRadius: ["case", ["==", ["get", "selected"], true], 35, 0],
            }}
          />
          <Mapbox.SymbolLayer
            filter={["==", ["get", "selected"], true]}
            id="memory-marker-selected-label"
            style={{
              textColor: "#51485D",
              textField: ["get", "location"],
              textHaloColor: "#FFF8EE",
              textHaloWidth: 2,
              textOffset: [0, 1.2],
              textSize: 12,
            }}
          />
        </Mapbox.ShapeSource>

        {points.map((point) => {
          const diary = point.diaries[0];
          const photoUri = diary?.photoUris?.[0] ?? diary?.photoUri;
          const selected = point.id === visualHighlightedPointId;

          return (
            <Mapbox.MarkerView
              allowOverlap
              anchor={{ x: 0.5, y: 1 }}
              coordinate={[point.coordinate.longitude, point.coordinate.latitude]}
              id={`memory-marker-view-${point.id}`}
              key={point.id}
            >
              <Pressable
                accessibilityLabel={`${point.location} 기록 열기`}
                accessibilityRole="button"
                onPress={() => openPoint(point)}
                style={[
                  styles.photoMarkerCanvas,
                  selected && { transform: [{ scale: markerScale }] },
                  visualHighlightedPointId && !selected && styles.photoMarkerDimmed,
                ]}
              >
                <View style={styles.photoFrame}>
                  {photoUri ? (
                    <RNImage
                      resizeMode="cover"
                      source={{ uri: photoUri }}
                      style={styles.photo}
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderText}>사진 없음</Text>
                    </View>
                  )}
                </View>
                <View style={styles.photoPointer} />
              </Pressable>
            </Mapbox.MarkerView>
          );
        })}

        {currentLocation ? (
          <Mapbox.PointAnnotation
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
            id="current-location"
          >
            <View style={styles.currentLocationMarker} />
          </Mapbox.PointAnnotation>
        ) : null}
      </Mapbox.MapView>

      <View pointerEvents="none" style={styles.mapTextureWash} />

      {!compact ? (
        <View
          pointerEvents="none"
          style={[styles.mapBadge, { top: 14 + topInset }]}
        >
          <Text style={styles.mapBadgeText}>{points.length} MEMORIES</Text>
        </View>
      ) : null}

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

      {!compact ? (
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
          <Text style={styles.locationButtonIcon}>
            {isLocating ? "…" : "⌖"}
          </Text>
        </Pressable>
      ) : null}

      {!compact ? (
        <Pressable
          accessibilityLabel="모든 추억 위치 보기"
          accessibilityRole="button"
          onPress={fitAllPoints}
          style={({ pressed }) => [
            styles.fitButton,
            pressed && styles.controlButtonPressed,
          ]}
        >
          <Text style={styles.fitButtonIcon}>◎</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const controlButton = (colors: ThemeColors) =>
  ({
    alignItems: "center",
    backgroundColor: "rgba(255, 253, 249, 0.82)",
    elevation: 4,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
  }) as const;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.map,
      borderRadius: 28,
      flex: 1,
      minHeight: 390,
      overflow: "hidden",
      position: "relative",
    },
    configurationError: {
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    configurationErrorText: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 6,
      textAlign: "center",
    },
    configurationErrorTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
    },
    containerExpanded: {
      borderRadius: 0,
      minHeight: 0,
    },
    currentLocationMarker: {
      backgroundColor: "#2D7FF9",
      borderColor: colors.surface,
      borderRadius: 10,
      borderWidth: 3,
      height: 20,
      width: 20,
    },
    photoMarkerCanvas: {
      alignItems: "center",
      height: 76,
      padding: 4,
      width: 68,
    },
    photoMarkerDimmed: {
      opacity: 0.35,
    },
    photoFrame: {
      backgroundColor: "#FFF9FC",
      borderColor: "#FFFFFF",
      borderRadius: 32,
      borderWidth: 3,
      elevation: 5,
      height: 60,
      overflow: "hidden",
      shadowColor: "#55445D",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.24,
      shadowRadius: 7,
      width: 60,
    },
    photo: {
      height: "100%",
      width: "100%",
    },
    photoPlaceholder: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      flex: 1,
      justifyContent: "center",
    },
    photoPlaceholderText: { color: colors.textMuted, fontSize: 8 },
    photoPointer: {
      backgroundColor: colors.primary,
      borderColor: "#FFFFFF",
      borderRadius: 7,
      borderWidth: 2,
      height: 14,
      marginTop: -2,
      width: 14,
    },
    mapTextureWash: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(246, 240, 232, 0.05)",
    },
    mapBadge: {
      backgroundColor: "rgba(255, 253, 249, 0.78)",
      borderRadius: 8,
      left: 14,
      paddingHorizontal: 9,
      paddingVertical: 6,
      position: "absolute",
    },
    mapBadgeText: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    fitButton: {
      ...controlButton(colors),
      borderRadius: 22,
      bottom: 18,
      height: 44,
      width: 44,
    },
    locationButton: {
      ...controlButton(colors),
      borderRadius: 22,
      bottom: 70,
      height: 44,
      width: 44,
    },
    expandButton: {
      ...controlButton(colors),
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
      fontWeight: "700",
    },
    fitButtonIcon: {
      color: colors.primary,
      fontSize: 25,
      fontWeight: "700",
    },
    locationButtonIcon: {
      color: colors.primary,
      fontSize: 24,
      fontWeight: "700",
    },
  });
