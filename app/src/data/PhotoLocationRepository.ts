import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "./database";
import type {
  PhotoLocationAssetCacheRecord,
  PhotoLocationSyncState,
} from "../types/photoLocation";

type PhotoLocationAssetRow = {
  asset_id: string;
  uri: string;
  filename: string | null;
  created_time: number | null;
  modified_time: number | null;
  width: number | null;
  height: number | null;
  media_type: string;
  latitude: number | null;
  longitude: number | null;
  source_type: PhotoLocationAssetCacheRecord["sourceType"];
  sync_status: PhotoLocationAssetCacheRecord["syncStatus"];
  attached_diary_id: string | null;
  attached_diary_photo_id: string | null;
  last_seen_at: string;
  updated_at: string;
};

type PhotoLocationSyncStateRow = {
  id: PhotoLocationSyncState["id"];
  last_scanned_cursor: string | null;
  last_scanned_modified_time: number | null;
  last_scan_started_at: string | null;
  last_scan_completed_at: string | null;
  updated_at: string;
};

function toAssetRecord(row: PhotoLocationAssetRow): PhotoLocationAssetCacheRecord {
  return {
    assetId: row.asset_id,
    uri: row.uri,
    filename: row.filename ?? undefined,
    createdTime: row.created_time ?? undefined,
    modifiedTime: row.modified_time ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    mediaType: row.media_type,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    sourceType: row.source_type,
    syncStatus: row.sync_status,
    attachedDiaryId: row.attached_diary_id ?? undefined,
    attachedDiaryPhotoId: row.attached_diary_photo_id ?? undefined,
    lastSeenAt: row.last_seen_at,
    updatedAt: row.updated_at,
  };
}

function toSyncState(row: PhotoLocationSyncStateRow): PhotoLocationSyncState {
  return {
    id: row.id,
    lastScannedCursor: row.last_scanned_cursor ?? undefined,
    lastScannedModifiedTime: row.last_scanned_modified_time ?? undefined,
    lastScanStartedAt: row.last_scan_started_at ?? undefined,
    lastScanCompletedAt: row.last_scan_completed_at ?? undefined,
    updatedAt: row.updated_at,
  };
}

export class PhotoLocationRepository {
  private async database(): Promise<SQLiteDatabase> {
    return getDatabase();
  }

  async getSyncState(): Promise<PhotoLocationSyncState> {
    const database = await this.database();
    const row = await database.getFirstAsync<PhotoLocationSyncStateRow>(
      "SELECT * FROM photo_location_sync_state WHERE id = ?",
      "device_library",
    );

    if (row) return toSyncState(row);

    const now = new Date().toISOString();
    await database.runAsync(
      "INSERT INTO photo_location_sync_state (id, updated_at) VALUES (?, ?)",
      "device_library",
      now,
    );
    return { id: "device_library", updatedAt: now };
  }

  async startScan(): Promise<void> {
    const database = await this.database();
    const now = new Date().toISOString();
    await database.runAsync(
      "UPDATE photo_location_sync_state SET last_scan_started_at = ?, updated_at = ? WHERE id = ?",
      now,
      now,
      "device_library",
    );
  }

  async completeScan(options: {
    endCursor?: string;
    lastScannedModifiedTime?: number;
  }): Promise<void> {
    const database = await this.database();
    const now = new Date().toISOString();
    await database.runAsync(
      `UPDATE photo_location_sync_state
       SET last_scanned_cursor = ?,
           last_scanned_modified_time = ?,
           last_scan_completed_at = ?,
           updated_at = ?
       WHERE id = ?`,
      options.endCursor ?? null,
      options.lastScannedModifiedTime ?? null,
      now,
      now,
      "device_library",
    );
  }

  async resetCursor(): Promise<void> {
    const database = await this.database();
    const now = new Date().toISOString();
    await database.runAsync(
      `UPDATE photo_location_sync_state
       SET last_scanned_cursor = NULL,
           last_scanned_modified_time = NULL,
           updated_at = ?
       WHERE id = ?`,
      now,
      "device_library",
    );
  }

  async upsertDeviceLibraryAssets(
    assets: ReadonlyArray<
      Omit<
        PhotoLocationAssetCacheRecord,
        | "sourceType"
        | "syncStatus"
        | "attachedDiaryId"
        | "attachedDiaryPhotoId"
        | "lastSeenAt"
        | "updatedAt"
      >
    >,
  ): Promise<void> {
    if (!assets.length) return;

    const database = await this.database();
    const now = new Date().toISOString();
    await database.withTransactionAsync(async () => {
      for (const asset of assets) {
        await database.runAsync(
          `INSERT INTO photo_location_assets (
             asset_id, uri, filename, created_time, modified_time, width, height,
             media_type, latitude, longitude, source_type, sync_status,
             last_seen_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'device_library', 'synced', ?, ?)
           ON CONFLICT(asset_id) DO UPDATE SET
             uri = excluded.uri,
             filename = excluded.filename,
             created_time = excluded.created_time,
             modified_time = excluded.modified_time,
             width = excluded.width,
             height = excluded.height,
             media_type = excluded.media_type,
             latitude = excluded.latitude,
             longitude = excluded.longitude,
             sync_status = 'synced',
             last_seen_at = excluded.last_seen_at,
             updated_at = excluded.updated_at`,
          asset.assetId,
          asset.uri,
          asset.filename ?? null,
          asset.createdTime ?? null,
          asset.modifiedTime ?? null,
          asset.width ?? null,
          asset.height ?? null,
          asset.mediaType,
          asset.latitude ?? null,
          asset.longitude ?? null,
          now,
          now,
        );
      }
    });
  }

  async markAssetsMissing(assetIds: readonly string[]): Promise<void> {
    if (!assetIds.length) return;

    const database = await this.database();
    const now = new Date().toISOString();
    await database.withTransactionAsync(async () => {
      for (const assetId of assetIds) {
        await database.runAsync(
          "UPDATE photo_location_assets SET sync_status = 'missing', updated_at = ? WHERE asset_id = ?",
          now,
          assetId,
        );
      }
    });
  }

  async listLocatedLibraryAssets(limit = 200): Promise<PhotoLocationAssetCacheRecord[]> {
    const database = await this.database();
    const rows = await database.getAllAsync<PhotoLocationAssetRow>(
      `SELECT *
       FROM photo_location_assets
       WHERE source_type = 'device_library'
         AND sync_status = 'synced'
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND attached_diary_id IS NULL
       ORDER BY modified_time DESC
       LIMIT ?`,
      limit,
    );

    return rows.map(toAssetRecord);
  }
}
