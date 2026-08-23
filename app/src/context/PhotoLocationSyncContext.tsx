import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as MediaLibrary from "expo-media-library";

import { deviceMediaLibraryAdapter } from "../data/DeviceMediaLibraryAdapter";
import { PhotoLocationRepository } from "../data/PhotoLocationRepository";

type PhotoLocationSyncStatus = "idle" | "permission_required" | "syncing" | "ready" | "error";

type PhotoLocationSyncContextValue = {
  status: PhotoLocationSyncStatus;
  hasPhotoPermission: boolean;
  accessPrivileges: "all" | "limited" | "none";
  lastSyncedAt?: string;
  syncNextBatch: () => Promise<void>;
};

const PhotoLocationSyncContext = createContext<PhotoLocationSyncContextValue | null>(null);
const repository = new PhotoLocationRepository();
const syncBatchSize = 30;
const startupSyncDelayMs = 700;
const backgroundBatchDelayMs = 1200;

function isReadablePermission(permission: { granted: boolean; accessPrivileges: "all" | "limited" | "none" }) {
  return permission.granted && permission.accessPrivileges !== "none";
}

export function PhotoLocationSyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PhotoLocationSyncStatus>("idle");
  const [hasPhotoPermission, setHasPhotoPermission] = useState(false);
  const [accessPrivileges, setAccessPrivileges] = useState<"all" | "limited" | "none">("none");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>();
  const isSyncingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const syncNextBatch = useCallback(async () => {
    if (isSyncingRef.current) return;

    const available = await deviceMediaLibraryAdapter.isAvailable();
    if (!available) {
      setStatus("permission_required");
      return;
    }

    const currentPermission = await deviceMediaLibraryAdapter.getPhotoPermission();
    let permission = currentPermission;

    if (!isReadablePermission(permission) && permission.canAskAgain) {
      permission = await deviceMediaLibraryAdapter.requestPhotoPermission();
    }

    setHasPhotoPermission(isReadablePermission(permission));
    setAccessPrivileges(permission.accessPrivileges);

    if (!isReadablePermission(permission)) {
      setStatus("permission_required");
      return;
    }

    isSyncingRef.current = true;
    setStatus("syncing");

    try {
      const syncState = await repository.getSyncState();
      await repository.startScan();
      const page = await deviceMediaLibraryAdapter.listPhotoAssetPage({
        first: syncBatchSize,
        after: syncState.lastScannedCursor,
      });
      await repository.upsertDeviceLibraryAssets(page.assets);

      const lastScannedModifiedTime = page.assets.reduce<number | undefined>(
        (latest, asset) =>
          asset.modifiedTime === undefined
            ? latest
            : latest === undefined
              ? asset.modifiedTime
              : Math.max(latest, asset.modifiedTime),
        syncState.lastScannedModifiedTime,
      );

      await repository.completeScan({
        endCursor: page.hasNextPage ? page.endCursor : undefined,
        lastScannedModifiedTime,
      });

      const now = new Date().toISOString();
      setLastSyncedAt(now);
      setStatus("ready");

      if (page.hasNextPage) {
        timeoutRef.current = setTimeout(() => {
          void syncNextBatch();
        }, backgroundBatchDelayMs);
      }
    } catch {
      setStatus("error");
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      void syncNextBatch();
    }, startupSyncDelayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [syncNextBatch]);

  useEffect(() => {
    const subscription = MediaLibrary.addListener((event) => {
      if (event.hasIncrementalChanges) {
        const deletedAssetIds = event.deletedAssets?.map((asset) => asset.id) ?? [];
        void repository.markAssetsMissing(deletedAssetIds);
      } else {
        void repository.resetCursor();
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        void syncNextBatch();
      }, backgroundBatchDelayMs);
    });

    return () => subscription.remove();
  }, [syncNextBatch]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState !== "active") return;
      void syncNextBatch();
    });

    return () => subscription.remove();
  }, [syncNextBatch]);

  const value = useMemo<PhotoLocationSyncContextValue>(
    () => ({
      status,
      hasPhotoPermission,
      accessPrivileges,
      lastSyncedAt,
      syncNextBatch,
    }),
    [accessPrivileges, hasPhotoPermission, lastSyncedAt, status, syncNextBatch],
  );

  return (
    <PhotoLocationSyncContext.Provider value={value}>
      {children}
    </PhotoLocationSyncContext.Provider>
  );
}

export function usePhotoLocationSync() {
  const context = useContext(PhotoLocationSyncContext);
  if (!context) {
    throw new Error("usePhotoLocationSync must be used inside PhotoLocationSyncProvider");
  }

  return context;
}
