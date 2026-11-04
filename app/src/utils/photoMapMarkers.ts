import type { DiaryPoint } from "../types/diary";
import type {
  DiaryPhotoMapMarker,
  LibraryPhotoMapMarker,
  PhotoLocationAssetCacheRecord,
  PhotoMapClusterMarker,
  PhotoMapMarker,
} from "../types/photoLocation";
import { isValidPhotoMapCoordinate } from "../types/photoLocation";

type BuildPhotoMapMarkersInput = {
  diaryPoints: DiaryPoint[];
  libraryAssets: PhotoLocationAssetCacheRecord[];
};

type ClusterPhotoMapMarkersOptions = {
  cellSizeDegrees?: number;
  minimumCount?: number;
};

const defaultClusterCellSizeDegrees = 0.002;

function photoCountForDiaryPoint(point: DiaryPoint) {
  return point.diaries.reduce((count, diary) => {
    const photoUris = diary.photoUris?.length
      ? diary.photoUris
      : diary.photoUri
        ? [diary.photoUri]
        : [];
    return count + photoUris.length;
  }, 0);
}

function collectDiaryPhotoUris(points: readonly DiaryPoint[]) {
  const uris = new Set<string>();

  points.forEach((point) => {
    point.diaries.forEach((diary) => {
      diary.photoUris?.forEach((uri) => uris.add(uri));
      if (diary.photoUri) uris.add(diary.photoUri);
      diary.photos?.forEach((photo) => uris.add(photo.fileUri));
    });
  });

  return uris;
}

function coordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

function clusterKey(latitude: number, longitude: number, cellSizeDegrees: number) {
  return `${Math.round(latitude / cellSizeDegrees)},${Math.round(longitude / cellSizeDegrees)}`;
}

function averageCoordinate(markers: readonly PhotoMapMarker[]) {
  const totals = markers.reduce(
    (sum, marker) => ({
      latitude: sum.latitude + marker.coordinate.latitude,
      longitude: sum.longitude + marker.coordinate.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: totals.latitude / markers.length,
    longitude: totals.longitude / markers.length,
  };
}

export function buildDiaryPhotoMapMarkers(
  points: readonly DiaryPoint[],
): DiaryPhotoMapMarker[] {
  return points
    .filter((point) => isValidPhotoMapCoordinate(point.coordinate))
    .map((point) => {
      const coverPhotoUri = point.diaries.find(
        (diary) => diary.photoUris?.[0] ?? diary.photoUri,
      );

      return {
        id: `diary-${point.id}`,
        kind: "diary",
        coordinate: point.coordinate,
        location: point.location,
        diaries: point.diaries,
        coverPhotoUri: coverPhotoUri?.photoUris?.[0] ?? coverPhotoUri?.photoUri,
        photoCount: photoCountForDiaryPoint(point),
      };
    });
}

export function buildLibraryPhotoMapMarkers(
  assets: readonly PhotoLocationAssetCacheRecord[],
  diaryPhotoUris: ReadonlySet<string>,
): LibraryPhotoMapMarker[] {
  const grouped = new Map<string, PhotoLocationAssetCacheRecord[]>();

  assets.forEach((asset) => {
    if (asset.attachedDiaryId || asset.attachedDiaryPhotoId) return;
    if (diaryPhotoUris.has(asset.uri)) return;
    const coordinate = {
      latitude: asset.latitude,
      longitude: asset.longitude,
    };
    if (!isValidPhotoMapCoordinate(coordinate)) {
      return;
    }

    const key = coordinateKey(coordinate.latitude, coordinate.longitude);
    grouped.set(key, [...(grouped.get(key) ?? []), asset]);
  });

  return Array.from(grouped.entries()).map(([key, groupedAssets]) => {
    const [latitudeString, longitudeString] = key.split(",");
    const sortedAssets = [...groupedAssets].sort(
      (a, b) => (b.createdTime ?? 0) - (a.createdTime ?? 0),
    );
    const previewAsset = sortedAssets[0];

    return {
      id: `library-photo-${key}`,
      kind: "library_photo",
      coordinate: {
        latitude: Number(latitudeString),
        longitude: Number(longitudeString),
      },
      assetIds: sortedAssets.map((asset) => asset.assetId),
      previewPhotoUri: previewAsset?.uri,
      photoCount: sortedAssets.length,
      takenAt:
        previewAsset?.createdTime === undefined
          ? undefined
          : new Date(previewAsset.createdTime).toISOString(),
    };
  });
}

export function buildPhotoMapMarkers({
  diaryPoints,
  libraryAssets,
}: BuildPhotoMapMarkersInput): PhotoMapMarker[] {
  const diaryMarkers = buildDiaryPhotoMapMarkers(diaryPoints);
  const libraryMarkers = buildLibraryPhotoMapMarkers(
    libraryAssets,
    collectDiaryPhotoUris(diaryPoints),
  );

  return [...diaryMarkers, ...libraryMarkers];
}

export function clusterPhotoMapMarkers(
  markers: readonly PhotoMapMarker[],
  {
    cellSizeDegrees = defaultClusterCellSizeDegrees,
    minimumCount = 2,
  }: ClusterPhotoMapMarkersOptions = {},
): PhotoMapMarker[] {
  const grouped = new Map<string, PhotoMapMarker[]>();

  markers.forEach((marker) => {
    const key = clusterKey(
      marker.coordinate.latitude,
      marker.coordinate.longitude,
      cellSizeDegrees,
    );
    grouped.set(key, [...(grouped.get(key) ?? []), marker]);
  });

  return Array.from(grouped.entries()).flatMap(([key, group]) => {
    if (group.length < minimumCount) return group;

    const diaryCount = group.reduce(
      (count, marker) =>
        marker.kind === "diary" ? count + marker.diaries.length : count,
      0,
    );
    const libraryPhotoCount = group.reduce(
      (count, marker) =>
        marker.kind === "library_photo" ? count + marker.photoCount : count,
      0,
    );
    const coordinate = averageCoordinate(group);
    const cluster: PhotoMapClusterMarker = {
      id: `cluster-${key}`,
      kind: "cluster",
      coordinate,
      diaryCount,
      libraryPhotoCount,
      totalCount: diaryCount + libraryPhotoCount,
    };

    return cluster;
  });
}
