import * as MediaLibrary from "expo-media-library";

import {
  isValidPhotoMapCoordinate,
  type PhotoLocationAssetCacheRecord,
} from "../types/photoLocation";

export type PhotoLibraryPermissionState = {
  granted: boolean;
  canAskAgain: boolean;
  status: MediaLibrary.PermissionResponse["status"];
  accessPrivileges: NonNullable<
    MediaLibrary.PermissionResponse["accessPrivileges"]
  >;
};

export type DevicePhotoAsset = Omit<
  PhotoLocationAssetCacheRecord,
  | "sourceType"
  | "syncStatus"
  | "attachedDiaryId"
  | "attachedDiaryPhotoId"
  | "lastSeenAt"
  | "updatedAt"
> & {
  hasGps: boolean;
  localUri?: string;
  isNetworkAsset?: boolean;
};

export type DevicePhotoAssetPage = {
  assets: DevicePhotoAsset[];
  endCursor?: string;
  hasNextPage: boolean;
  totalCount: number;
};

export type DevicePhotoAssetPageOptions = {
  first?: number;
  after?: string;
  createdAfter?: Date | number;
  createdBefore?: Date | number;
  includeLocation?: boolean;
};

const defaultPageSize = 50;

function normalizePermission(
  permission: MediaLibrary.PermissionResponse,
): PhotoLibraryPermissionState {
  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
    status: permission.status,
    accessPrivileges: permission.accessPrivileges ?? "none",
  };
}

function normalizeAsset(
  asset: MediaLibrary.Asset,
  info?: MediaLibrary.AssetInfo,
): DevicePhotoAsset {
  const coordinate = info?.location;
  const hasGps = isValidPhotoMapCoordinate(coordinate);

  return {
    assetId: asset.id,
    uri: info?.localUri ?? info?.uri ?? asset.uri,
    filename: asset.filename,
    createdTime: asset.creationTime,
    modifiedTime: asset.modificationTime,
    width: asset.width,
    height: asset.height,
    mediaType: asset.mediaType,
    latitude: hasGps ? coordinate.latitude : undefined,
    longitude: hasGps ? coordinate.longitude : undefined,
    hasGps,
    localUri: info?.localUri,
    isNetworkAsset: info?.isNetworkAsset,
  };
}

async function getAssetInfo(asset: MediaLibrary.Asset) {
  try {
    return await MediaLibrary.getAssetInfoAsync(asset, {
      shouldDownloadFromNetwork: false,
    });
  } catch {
    return undefined;
  }
}

export const deviceMediaLibraryAdapter = {
  async isAvailable() {
    return MediaLibrary.isAvailableAsync();
  },

  async getPhotoPermission() {
    const permission = await MediaLibrary.getPermissionsAsync(false, ["photo"]);
    return normalizePermission(permission);
  },

  async requestPhotoPermission() {
    const permission = await MediaLibrary.requestPermissionsAsync(false, [
      "photo",
    ]);
    return normalizePermission(permission);
  },

  async listPhotoAssetPage({
    first = defaultPageSize,
    after,
    createdAfter,
    createdBefore,
    includeLocation = true,
  }: DevicePhotoAssetPageOptions = {}): Promise<DevicePhotoAssetPage> {
    const page = await MediaLibrary.getAssetsAsync({
      first,
      after,
      createdAfter,
      createdBefore,
      mediaType: MediaLibrary.MediaType.photo,
      resolveWithFullInfo: includeLocation,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    const assets = await Promise.all(
      page.assets.map(async (asset) =>
        normalizeAsset(asset, includeLocation ? await getAssetInfo(asset) : undefined),
      ),
    );

    return {
      assets,
      endCursor: page.endCursor || undefined,
      hasNextPage: page.hasNextPage,
      totalCount: page.totalCount,
    };
  },
};
