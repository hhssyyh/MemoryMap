import { useEffect, useMemo, useRef, useState } from "react";
import { Image as RNImage, Pressable, StyleSheet, View } from "react-native";
import * as Mapbox from "@rnmapbox/maps";

import type { ThemeColors } from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";
import type { CurrentCoordinate } from "../hooks/useCurrentLocation";
import type { DiaryPoint } from "../types/diary";
import type { MapSearchPlace } from "../types/mapSearch";
import type {
  DiaryPhotoMapMarker,
  LibraryPhotoMapMarker,
  PhotoMapMarker,
} from "../types/photoLocation";
import { buildDiaryPhotoMapMarkers } from "../utils/photoMapMarkers";
import { ThemedText as Text } from "./ThemedText";

type MemoryMapProps = {
  points: DiaryPoint[];
  photoMarkers?: PhotoMapMarker[];
  photoSyncStatus?: "idle" | "permission_required" | "syncing" | "ready" | "error";
  compact?: boolean;
  focusCoordinate?: CurrentCoordinate;
  highlightedPointId?: string;
  minimumHeight?: number;
  onMapInteraction?: () => void;
  onSelectPoint?: (point: DiaryPoint) => void;
  onOpenDiaries?: (point: DiaryPoint) => void;
  routeMode?: "daily" | "sequence";
  searchTarget?: MapSearchPlace | null;
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
  kind: PhotoMapMarker["kind"];
  label: string;
  markerId: string;
  pointId?: string;
  selected: boolean;
};

type SearchTargetProperties = {
  label: string;
};

type ShapePressEvent = {
  features: GeoJSON.Feature[];
};

function createMarkerCollection(
  markers: PhotoMapMarker[],
  selectedMarkerId: string,
): GeoJSON.FeatureCollection<GeoJSON.Point, MarkerProperties> {
  return {
    type: "FeatureCollection",
    features: markers.map((marker) => ({
      type: "Feature",
      id: marker.id,
      geometry: {
        type: "Point",
        coordinates: [marker.coordinate.longitude, marker.coordinate.latitude],
      },
      properties: {
        kind: marker.kind,
        label:
          marker.kind === "diary"
            ? marker.location
            : marker.kind === "library_photo"
              ? `${marker.photoCount} photos`
              : `${marker.totalCount} items`,
        markerId: marker.id,
        pointId:
          marker.kind === "diary"
            ? marker.id.replace(/^diary-/, "")
            : undefined,
        selected: marker.id === selectedMarkerId,
      },
    })),
  };
}

function createSearchTargetCollection(
  searchTarget?: MapSearchPlace | null,
): GeoJSON.FeatureCollection<GeoJSON.Point, SearchTargetProperties> {
  return {
    type: "FeatureCollection",
    features: searchTarget
      ? [
          {
            type: "Feature",
            id: searchTarget.id,
            geometry: {
              type: "Point",
              coordinates: [
                searchTarget.coordinate.longitude,
                searchTarget.coordinate.latitude,
              ],
            },
            properties: {
              label: searchTarget.name,
            },
          },
        ]
      : [],
  };
}

function createDailyRouteCollection(
  points: DiaryPoint[],
): GeoJSON.FeatureCollection<GeoJSON.LineString, { date: string }> {
  const diariesByDate = new Map<string, { id: string; routeOrder?: number; visitedAt?: string; coordinate: [number, number] }[]>();

  points.forEach((point) => {
    point.diaries.forEach((diary) => {
      const date = (diary.visitedAt ?? diary.date).slice(0, 10);
      const diaries = diariesByDate.get(date) ?? [];
      diaries.push({
        id: diary.id,
        routeOrder: diary.routeOrder,
        visitedAt: diary.visitedAt,
        coordinate: [diary.longitude ?? point.coordinate.longitude, diary.latitude ?? point.coordinate.latitude],
      });
      diariesByDate.set(date, diaries);
    });
  });

  return {
    type: "FeatureCollection",
    features: Array.from(diariesByDate.entries())
      .map(([date, diaries]) => ({
        date,
        coordinates: diaries
          .sort((a, b) => (a.routeOrder ?? Number.MAX_SAFE_INTEGER) - (b.routeOrder ?? Number.MAX_SAFE_INTEGER) || (a.visitedAt ?? '').localeCompare(b.visitedAt ?? '') || a.id.localeCompare(b.id))
          .map((diary) => diary.coordinate),
      }))
      .filter(({ coordinates }) => coordinates.length >= 2)
      .map(({ date, coordinates }) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: { date },
      })),
  };
}

function createSequenceRouteCollection(
  points: DiaryPoint[],
): GeoJSON.FeatureCollection<GeoJSON.LineString, { date: string }> {
  const coordinates = points
    .flatMap((point) =>
      point.diaries.map((diary) => ({
        id: diary.id,
        routeOrder: diary.routeOrder,
        visitedAt: diary.visitedAt ?? diary.date,
        coordinate: [
          diary.longitude ?? point.coordinate.longitude,
          diary.latitude ?? point.coordinate.latitude,
        ] as [number, number],
      })),
    )
    .sort(
      (a, b) =>
        (a.routeOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.routeOrder ?? Number.MAX_SAFE_INTEGER) ||
        (a.visitedAt ?? "").localeCompare(b.visitedAt ?? "") ||
        a.id.localeCompare(b.id),
    )
    .map((diary) => diary.coordinate);

  return {
    type: "FeatureCollection",
    features:
      coordinates.length >= 2
        ? [
            {
              type: "Feature",
              geometry: { type: "LineString", coordinates },
              properties: { date: "collection" },
            },
          ]
        : [],
  };
}

function toDiaryPoint(marker: DiaryPhotoMapMarker): DiaryPoint {
  return {
    id: marker.id.replace(/^diary-/, ""),
    location: marker.location,
    coordinate: marker.coordinate,
    diaries: marker.diaries,
  };
}

if (accessToken) {
  void Mapbox.setAccessToken(accessToken);
}

export function MemoryMap({
  points,
  photoMarkers,
  photoSyncStatus = "idle",
  compact = false,
  focusCoordinate,
  highlightedPointId,
  minimumHeight = 390,
  onMapInteraction,
  onSelectPoint,
  onOpenDiaries,
  routeMode = "daily",
  searchTarget,
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
  const [selectedLibraryMarker, setSelectedLibraryMarker] =
    useState<LibraryPhotoMapMarker>();
  const displayMarkers = useMemo<PhotoMapMarker[]>(
    () => photoMarkers ?? buildDiaryPhotoMapMarkers(points),
    [photoMarkers, points],
  );
  const selectedMarkerId = selectedLibraryMarker?.id
    ?? (visualHighlightedPointId ? `diary-${visualHighlightedPointId}` : "");
  const markerCollection = useMemo(
    () => createMarkerCollection(displayMarkers, selectedMarkerId),
    [displayMarkers, selectedMarkerId],
  );
  const routeCollection = useMemo(
    () =>
      routeMode === "sequence"
        ? createSequenceRouteCollection(points)
        : createDailyRouteCollection(points),
    [points, routeMode],
  );
  const searchTargetCollection = useMemo(
    () => createSearchTargetCollection(searchTarget),
    [searchTarget],
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

  useEffect(() => {
    if (!searchTarget) return;

    cameraRef.current?.setCamera({
      animationDuration: 650,
      animationMode: "flyTo",
      centerCoordinate: [
        searchTarget.coordinate.longitude,
        searchTarget.coordinate.latitude,
      ],
      zoomLevel: 14.5,
      padding: {
        paddingBottom: expanded ? 180 : 130,
        paddingLeft: 36,
        paddingRight: 36,
        paddingTop: 120 + topInset,
      },
    });
  }, [expanded, searchTarget, topInset]);

  const fitAllPoints = () => {
    const coordinates = displayMarkers.map((marker) => marker.coordinate);
    if (coordinates.length === 0) {
      return;
    }

    const longitudes = coordinates.map((coordinate) => coordinate.longitude);
    const latitudes = coordinates.map((coordinate) => coordinate.latitude);

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
    setSelectedLibraryMarker(undefined);
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

  const openLibraryMarker = (marker: LibraryPhotoMapMarker) => {
    setSelectedLibraryMarker(marker);
    setVisualHighlightedPointId(undefined);
    cameraRef.current?.setCamera({
      animationDuration: 550,
      animationMode: "easeTo",
      centerCoordinate: [
        marker.coordinate.longitude,
        marker.coordinate.latitude,
      ],
      zoomLevel: 14,
      padding: {
        paddingBottom: expanded ? 240 : 150,
        paddingLeft: 36,
        paddingRight: 36,
        paddingTop: 72,
      },
    });
  };

  const handleMarkerPress = async (event: ShapePressEvent) => {
    onMapInteraction?.();

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

    const marker = displayMarkers.find(
      (candidate) => candidate.id === feature.properties?.markerId,
    );

    if (marker?.kind === "diary") {
      openPoint(toDiaryPoint(marker));
    } else if (marker?.kind === "library_photo") {
      openLibraryMarker(marker);
    }
  };

  const diaryMarkers = displayMarkers.filter(
    (marker): marker is DiaryPhotoMapMarker => marker.kind === "diary",
  );
  const libraryMarkers = displayMarkers.filter(
    (marker): marker is LibraryPhotoMapMarker => marker.kind === "library_photo",
  );
  const libraryPhotoCount = libraryMarkers.reduce(
    (count, marker) => count + marker.photoCount,
    0,
  );
  const photoStatusText =
    photoSyncStatus === "syncing"
      ? "사진 동기화 중"
      : photoSyncStatus === "permission_required"
        ? "사진 권한 필요"
        : photoSyncStatus === "error"
          ? "사진 동기화 오류"
          : libraryPhotoCount > 0
            ? `위치 사진 ${libraryPhotoCount}개`
            : "위치 사진 없음";

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
    <View
      style={[
        styles.container,
        { minHeight: expanded ? 0 : minimumHeight },
        expanded && styles.containerExpanded,
      ]}
    >
      <Mapbox.MapView
        compassEnabled={false}
        logoEnabled
        onPress={onMapInteraction}
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

        <Mapbox.ShapeSource id="memory-routes" shape={routeCollection}>
          <Mapbox.LineLayer
            id="memory-route-lines"
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
              textField: ["get", "label"],
              textHaloColor: "#FFF8EE",
              textHaloWidth: 2,
              textOffset: [0, 1.2],
              textSize: 12,
            }}
          />
        </Mapbox.ShapeSource>

        {diaryMarkers.map((marker) => {
          const diary = marker.diaries[0];
          const photoUri = marker.coverPhotoUri ?? diary?.photoUris?.[0] ?? diary?.photoUri;
          const point = toDiaryPoint(marker);
          const selected = point.id === visualHighlightedPointId;

          return (
            <Mapbox.MarkerView
              allowOverlap
              anchor={{ x: 0.5, y: 1 }}
              coordinate={[marker.coordinate.longitude, marker.coordinate.latitude]}
              id={`memory-marker-view-${marker.id}`}
              key={marker.id}
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

        {libraryMarkers.map((marker) => {
          const selected = selectedLibraryMarker?.id === marker.id;

          return (
            <Mapbox.MarkerView
              allowOverlap
              anchor={{ x: 0.5, y: 1 }}
              coordinate={[marker.coordinate.longitude, marker.coordinate.latitude]}
              id={`library-photo-marker-view-${marker.id}`}
              key={marker.id}
            >
              <Pressable
                accessibilityLabel={`위치 사진 ${marker.photoCount}개 보기`}
                accessibilityRole="button"
                onPress={() => openLibraryMarker(marker)}
                style={[
                  styles.libraryMarkerCanvas,
                  selected && styles.libraryMarkerSelected,
                ]}
              >
                <View style={styles.libraryPhotoFrame}>
                  {marker.previewPhotoUri ? (
                    <RNImage
                      resizeMode="cover"
                      source={{ uri: marker.previewPhotoUri }}
                      style={styles.photo}
                    />
                  ) : (
                    <Text style={styles.libraryPhotoIcon}>▧</Text>
                  )}
                </View>
                <View style={styles.libraryCountBadge}>
                  <Text style={styles.libraryCountText}>{marker.photoCount}</Text>
                </View>
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

        <Mapbox.ShapeSource
          id="map-search-target"
          shape={searchTargetCollection}
        >
          <Mapbox.CircleLayer
            id="map-search-target-halo"
            style={{
              circleColor: "#FFFFFF",
              circleOpacity: 0.88,
              circleRadius: 16,
              circleStrokeColor: colors.primary,
              circleStrokeWidth: 3,
            }}
          />
          <Mapbox.CircleLayer
            id="map-search-target-dot"
            style={{
              circleColor: colors.primary,
              circleRadius: 6,
            }}
          />
          <Mapbox.SymbolLayer
            id="map-search-target-label"
            style={{
              textAllowOverlap: true,
              textColor: colors.text,
              textField: ["get", "label"],
              textHaloColor: "#FFFDF9",
              textHaloWidth: 2,
              textOffset: [0, -2.1],
              textSize: 12,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>

      <View pointerEvents="none" style={styles.mapTextureWash} />

      {!compact ? (
        <View
          pointerEvents="none"
          style={[styles.mapBadge, { top: 14 + topInset }]}
        >
          <Text style={styles.mapBadgeText}>{points.length} MEMORIES</Text>
          <Text style={styles.mapBadgeSubtext}>{photoStatusText}</Text>
        </View>
      ) : null}

      {!compact && selectedLibraryMarker ? (
        <View style={styles.photoPreview}>
          <View style={styles.photoPreviewImageFrame}>
            {selectedLibraryMarker.previewPhotoUri ? (
              <RNImage
                resizeMode="cover"
                source={{ uri: selectedLibraryMarker.previewPhotoUri }}
                style={styles.photo}
              />
            ) : (
              <Text style={styles.libraryPhotoIcon}>▧</Text>
            )}
          </View>
          <View style={styles.photoPreviewText}>
            <Text style={styles.photoPreviewTitle}>
              위치 사진 {selectedLibraryMarker.photoCount}개
            </Text>
            <Text style={styles.photoPreviewSubtitle}>
              아직 다이어리에 연결되지 않은 사진입니다.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="사진 미리보기 닫기"
            accessibilityRole="button"
            onPress={() => setSelectedLibraryMarker(undefined)}
            style={styles.photoPreviewClose}
          >
            <Text style={styles.photoPreviewCloseText}>×</Text>
          </Pressable>
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
    justifyContent: "center",
    position: "absolute",
    right: 16,
  }) as const;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.map,
      borderRadius: 28,
      flex: 1,
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
    libraryMarkerCanvas: {
      alignItems: "center",
      height: 62,
      justifyContent: "center",
      position: "relative",
      width: 62,
    },
    libraryMarkerSelected: {
      transform: [{ scale: 1.08 }],
    },
    libraryPhotoFrame: {
      alignItems: "center",
      backgroundColor: "#EAF4F5",
      borderColor: "#FFFFFF",
      borderRadius: 8,
      borderWidth: 3,
      elevation: 5,
      height: 48,
      justifyContent: "center",
      overflow: "hidden",
      shadowColor: "#334B50",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 7,
      width: 48,
    },
    libraryPhotoIcon: {
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: "800",
    },
    libraryCountBadge: {
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderColor: "#FFFFFF",
      borderRadius: 10,
      borderWidth: 2,
      bottom: 4,
      height: 20,
      justifyContent: "center",
      minWidth: 20,
      paddingHorizontal: 4,
      position: "absolute",
      right: 2,
    },
    libraryCountText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
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
      color: colors.text,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    mapBadgeSubtext: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
      marginTop: 2,
    },
    photoPreview: {
      alignItems: "center",
      backgroundColor: "rgba(255, 253, 249, 0.94)",
      borderColor: "rgba(255,255,255,0.9)",
      borderRadius: 12,
      borderWidth: 1,
      bottom: 18,
      elevation: 10,
      flexDirection: "row",
      gap: 10,
      left: 16,
      padding: 10,
      paddingRight: 48,
      position: "absolute",
      right: 76,
      shadowColor: "#334B50",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.14,
      shadowRadius: 14,
    },
    photoPreviewImageFrame: {
      alignItems: "center",
      backgroundColor: "#EAF4F5",
      borderRadius: 8,
      height: 48,
      justifyContent: "center",
      overflow: "hidden",
      width: 48,
    },
    photoPreviewText: {
      flex: 1,
    },
    photoPreviewTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    photoPreviewSubtitle: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    photoPreviewClose: {
      alignItems: "center",
      height: 36,
      justifyContent: "center",
      position: "absolute",
      right: 8,
      width: 36,
    },
    photoPreviewCloseText: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 26,
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
      textShadowColor: "rgba(35, 22, 27, 0.72)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 5,
    },
    fitButtonIcon: {
      color: "#FFFFFF",
      fontSize: 25,
      fontWeight: "700",
      textShadowColor: "rgba(35, 22, 27, 0.72)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 5,
    },
    locationButtonIcon: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "700",
      textShadowColor: "rgba(35, 22, 27, 0.72)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 5,
    },
  });
