import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

const migrations: ReadonlyArray<string> = [
  `
    CREATE TABLE IF NOT EXISTS saved_locations (
      id TEXT PRIMARY KEY NOT NULL,
      location TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS diaries (
      id TEXT PRIMARY KEY NOT NULL,
      trip_name TEXT,
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      visited_at TEXT NOT NULL,
      route_order INTEGER,
      tags_json TEXT NOT NULL DEFAULT '[]',
      weather TEXT,
      temperature TEXT,
      time TEXT,
      is_saved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS diary_photos (
      id TEXT PRIMARY KEY NOT NULL,
      diary_id TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      exif_latitude REAL,
      exif_longitude REAL,
      taken_at TEXT,
      sort_order INTEGER NOT NULL,
      is_cover INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS diaries_visited_at_idx ON diaries(visited_at DESC);
    CREATE INDEX IF NOT EXISTS diary_photos_diary_id_idx ON diary_photos(diary_id, sort_order);
    INSERT OR IGNORE INTO saved_locations (id, location, latitude, longitude) VALUES
      ('seoul-forest', '서울숲', 37.5444, 127.0374),
      ('seongsu', '성수동', 37.5446, 127.056),
      ('hangang', '한강 뚝섬공원', 37.5293, 127.0699),
      ('louvre', 'Louvre Museum, Paris', 48.8606, 2.3376);
    INSERT OR IGNORE INTO diaries (id, trip_name, location, latitude, longitude, title, content, visited_at, route_order, tags_json, weather, temperature, time, is_saved, created_at, updated_at) VALUES
      ('sample-seoul-forest-walk', '서울 산책', '서울숲', 37.5444, 127.0374, '초여름 서울숲', '나무 그늘 아래를 천천히 걸으며 보낸 오후.', '2026-06-21T16:10:00.000Z', 1, '["서울숲","산책","초여름"]', '맑음', '27°C', '16:10', 0, '2026-06-21T16:10:00.000Z', '2026-06-21T16:10:00.000Z'),
      ('sample-seongsu-coffee', '서울 산책', '성수동', 37.5446, 127.056, '오후의 커피', '조용한 카페에서 잠시 쉬어 간 시간.', '2026-06-21T15:30:00.000Z', 2, '["성수","카페","커피"]', '맑음', '26°C', '15:30', 0, '2026-06-21T15:30:00.000Z', '2026-06-21T15:30:00.000Z'),
      ('sample-hangang-sunset', '서울 산책', '한강 뚝섬공원', 37.5293, 127.0699, '한강의 노을', '강 건너로 천천히 내려가는 빛을 바라보았다.', '2026-06-21T19:05:00.000Z', 3, '["한강","노을","산책"]', '맑음', '25°C', '19:05', 0, '2026-06-21T19:05:00.000Z', '2026-06-21T19:05:00.000Z');
  `,
  `
    CREATE TABLE IF NOT EXISTS handwriting_documents (
      id TEXT PRIMARY KEY NOT NULL,
      diary_id TEXT NOT NULL UNIQUE,
      schema_version INTEGER NOT NULL,
      selected_page_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS handwriting_pages (
      id TEXT PRIMARY KEY NOT NULL,
      document_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      background_json TEXT NOT NULL,
      layers_json TEXT NOT NULL,
      thumbnail_uri TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES handwriting_documents(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS handwriting_pages_order_idx
      ON handwriting_pages(document_id, sort_order);
  `,
  `
    ALTER TABLE handwriting_pages ADD COLUMN content_revision INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE handwriting_pages ADD COLUMN thumbnail_revision INTEGER;
  `,
  `
    CREATE TABLE IF NOT EXISTS photo_location_assets (
      asset_id TEXT PRIMARY KEY NOT NULL,
      uri TEXT NOT NULL,
      filename TEXT,
      created_time INTEGER,
      modified_time INTEGER,
      width INTEGER,
      height INTEGER,
      media_type TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      source_type TEXT NOT NULL DEFAULT 'device_library',
      sync_status TEXT NOT NULL DEFAULT 'pending',
      attached_diary_id TEXT,
      attached_diary_photo_id TEXT,
      last_seen_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (attached_diary_id) REFERENCES diaries(id) ON DELETE SET NULL,
      FOREIGN KEY (attached_diary_photo_id) REFERENCES diary_photos(id) ON DELETE SET NULL,
      CHECK (source_type IN ('device_library')),
      CHECK (sync_status IN ('pending', 'synced', 'missing', 'error')),
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
    );
    CREATE TABLE IF NOT EXISTS photo_location_sync_state (
      id TEXT PRIMARY KEY NOT NULL,
      last_scanned_cursor TEXT,
      last_scanned_modified_time INTEGER,
      last_scan_started_at TEXT,
      last_scan_completed_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS photo_location_assets_coordinate_idx
      ON photo_location_assets(latitude, longitude)
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    CREATE INDEX IF NOT EXISTS photo_location_assets_modified_time_idx
      ON photo_location_assets(modified_time DESC);
    CREATE INDEX IF NOT EXISTS photo_location_assets_source_status_idx
      ON photo_location_assets(source_type, sync_status);
    CREATE INDEX IF NOT EXISTS photo_location_assets_attached_diary_idx
      ON photo_location_assets(attached_diary_id);
    INSERT OR IGNORE INTO photo_location_sync_state (id, updated_at)
      VALUES ('device_library', datetime('now'));
  `,
  `
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_photo_uri TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS collection_diaries (
      collection_id TEXT NOT NULL,
      diary_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL,
      PRIMARY KEY (collection_id, diary_id),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS collection_diaries_collection_order_idx
      ON collection_diaries(collection_id, sort_order, diary_id);
    CREATE INDEX IF NOT EXISTS collection_diaries_diary_idx
      ON collection_diaries(diary_id);
    INSERT OR IGNORE INTO collections (id, title, description, cover_photo_uri, created_at, updated_at)
      SELECT
        'trip-' || lower(replace(replace(trim(trip_name), ' ', '-'), '/', '-')),
        trim(trip_name),
        NULL,
        (
          SELECT file_uri
          FROM diary_photos
          WHERE diary_photos.diary_id = diaries.id
          ORDER BY is_cover DESC, sort_order ASC
          LIMIT 1
        ),
        MIN(created_at),
        MAX(updated_at)
      FROM diaries
      WHERE trip_name IS NOT NULL AND trim(trip_name) != ''
      GROUP BY trim(trip_name);
    INSERT OR IGNORE INTO collection_diaries (collection_id, diary_id, sort_order, added_at)
      SELECT
        'trip-' || lower(replace(replace(trim(trip_name), ' ', '-'), '/', '-')),
        id,
        COALESCE(route_order, 0),
        created_at
      FROM diaries
      WHERE trip_name IS NOT NULL AND trim(trip_name) != '';
  `,
  `
    INSERT OR IGNORE INTO diary_photos (id, diary_id, file_uri, exif_latitude, exif_longitude, taken_at, sort_order, is_cover, created_at) VALUES
      ('sample-seoul-forest-walk-photo-1', 'sample-seoul-forest-walk', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85', NULL, NULL, '2026-06-21T16:10:00.000Z', 0, 1, '2026-06-21T16:10:00.000Z'),
      ('sample-seongsu-coffee-photo-1', 'sample-seongsu-coffee', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85', NULL, NULL, '2026-06-21T15:30:00.000Z', 0, 1, '2026-06-21T15:30:00.000Z'),
      ('sample-hangang-sunset-photo-1', 'sample-hangang-sunset', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop', NULL, NULL, '2026-06-21T19:05:00.000Z', 0, 1, '2026-06-21T19:05:00.000Z');
    UPDATE collections
    SET cover_photo_uri = (
      SELECT diary_photos.file_uri
      FROM collection_diaries
      JOIN diary_photos ON diary_photos.diary_id = collection_diaries.diary_id
      WHERE collection_diaries.collection_id = collections.id
      ORDER BY collection_diaries.sort_order ASC, diary_photos.is_cover DESC, diary_photos.sort_order ASC
      LIMIT 1
    )
    WHERE cover_photo_uri IS NULL;
  `,
    `
    CREATE TABLE IF NOT EXISTS base_points (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (latitude >= -90 AND latitude <= 90),
      CHECK (longitude >= -180 AND longitude <= 180),
      CHECK (radius_meters > 0),
      CHECK (is_active IN (0, 1))
    );

    CREATE INDEX IF NOT EXISTS base_points_active_idx
      ON base_points(is_active);
  `,
    `
    CREATE TABLE IF NOT EXISTS geofence_events (
      id TEXT PRIMARY KEY NOT NULL,
      base_point_id TEXT,
      transition_type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (base_point_id)
        REFERENCES base_points(id)
        ON DELETE SET NULL,
      CHECK (transition_type IN ('ENTER', 'EXIT')),
      CHECK (
        source IN (
          'BACKGROUND_GEOFENCE',
          'FOREGROUND_DISTANCE',
          'MANUAL_TEST'
        )
      ),
      CHECK (
        latitude IS NULL OR
        (latitude >= -90 AND latitude <= 90)
      ),
      CHECK (
        longitude IS NULL OR
        (longitude >= -180 AND longitude <= 180)
      )
    );

    CREATE INDEX IF NOT EXISTS geofence_events_occurred_at_idx
      ON geofence_events(occurred_at DESC);

    CREATE INDEX IF NOT EXISTS geofence_events_base_point_idx
      ON geofence_events(base_point_id, occurred_at DESC);
  `,
];

async function migrate(database: SQLite.SQLiteDatabase) {
  await database.execAsync('PRAGMA foreign_keys = ON;');
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  while (currentVersion < migrations.length) {
    const nextVersion = currentVersion + 1;
    const migration = migrations[currentVersion];
    if (!migration) throw new Error(`Missing database migration ${nextVersion}.`);
    await database.withTransactionAsync(async () => {
      await database.execAsync(migration);
      await database.execAsync(`PRAGMA user_version = ${nextVersion};`);
    });
    currentVersion = nextVersion;
  }

  // The photo-map branch used version 3 before the handwriting migration reached main.
  const handwritingColumns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(handwriting_pages)',
  );
  if (handwritingColumns.length > 0) {
    const existingColumns = new Set(handwritingColumns.map((column) => column.name));
    if (!existingColumns.has('content_revision')) {
      await database.execAsync(
        'ALTER TABLE handwriting_pages ADD COLUMN content_revision INTEGER NOT NULL DEFAULT 0;',
      );
    }
    if (!existingColumns.has('thumbnail_revision')) {
      await database.execAsync(
        'ALTER TABLE handwriting_pages ADD COLUMN thumbnail_revision INTEGER;',
      );
    }
  }
}

export function getDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync('memory-map.db').then(async (database) => {
    await migrate(database);
    return database;
  });

  return databasePromise;
}