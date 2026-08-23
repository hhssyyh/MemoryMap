import { useCallback, useEffect, useMemo, useState } from "react";

import { PhotoLocationRepository } from "../data/PhotoLocationRepository";
import { usePhotoLocationSync } from "../context/PhotoLocationSyncContext";
import type { DiaryPoint } from "../types/diary";
import type {
  PhotoLocationAssetCacheRecord,
  PhotoMapMarker,
} from "../types/photoLocation";
import { buildPhotoMapMarkers } from "../utils/photoMapMarkers";

const repository = new PhotoLocationRepository();

export function usePhotoMapMarkers(points: DiaryPoint[]) {
  const { lastSyncedAt, status: syncStatus } = usePhotoLocationSync();
  const [libraryAssets, setLibraryAssets] = useState<
    PhotoLocationAssetCacheRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setLibraryAssets(await repository.listLocatedLibraryAssets());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [lastSyncedAt, refresh, syncStatus]);

  const markers = useMemo(
    () =>
      buildPhotoMapMarkers({
        diaryPoints: points,
        libraryAssets,
      }),
    [libraryAssets, points],
  );

  return {
    markers,
    isLoading,
    refresh,
    syncStatus,
  };
}
