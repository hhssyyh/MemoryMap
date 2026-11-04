import type { DiaryEntry } from "./diary";

export type PhotoMapMarkerSource = "diary" | "library_photo";

export type PhotoMapClusterSource = "cluster";

export type PhotoMapMarkerKind = PhotoMapMarkerSource | PhotoMapClusterSource;

export type PhotoLocationAssetSourceType = "device_library";

export type PhotoLocationSyncStatus = "pending" | "synced" | "missing" | "error";

export type PhotoMapCoordinate = {
  latitude: number;
  longitude: number;
};

export type DiaryPhotoMapMarker = {
  id: string;
  kind: "diary";
  coordinate: PhotoMapCoordinate;
  location: string;
  diaries: DiaryEntry[];
  coverPhotoUri?: string;
  photoCount: number;
};

export type LibraryPhotoMapMarker = {
  id: string;
  kind: "library_photo";
  coordinate: PhotoMapCoordinate;
  assetIds: string[];
  previewPhotoUri?: string;
  photoCount: number;
  takenAt?: string;
};

export type PhotoMapClusterMarker = {
  id: string;
  kind: "cluster";
  coordinate: PhotoMapCoordinate;
  diaryCount: number;
  libraryPhotoCount: number;
  totalCount: number;
};

export type PhotoMapMarker =
  | DiaryPhotoMapMarker
  | LibraryPhotoMapMarker
  | PhotoMapClusterMarker;

export type PhotoLocationAssetCacheRecord = {
  assetId: string;
  uri: string;
  filename?: string;
  createdTime?: number;
  modifiedTime?: number;
  width?: number;
  height?: number;
  mediaType: string;
  latitude?: number;
  longitude?: number;
  sourceType: PhotoLocationAssetSourceType;
  syncStatus: PhotoLocationSyncStatus;
  attachedDiaryId?: string;
  attachedDiaryPhotoId?: string;
  lastSeenAt: string;
  updatedAt: string;
};

export type PhotoLocationSyncState = {
  id: "device_library";
  lastScannedCursor?: string;
  lastScannedModifiedTime?: number;
  lastScanStartedAt?: string;
  lastScanCompletedAt?: string;
  updatedAt: string;
};

export function isValidPhotoMapCoordinate(
  coordinate: Partial<PhotoMapCoordinate> | null | undefined,
): coordinate is PhotoMapCoordinate {
  if (!coordinate) return false;

  const { latitude, longitude } = coordinate;
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}
