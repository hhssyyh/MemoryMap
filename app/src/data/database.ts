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
}

export function getDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync('memory-map.db').then(async (database) => {
    await migrate(database);
    return database;
  });

  return databasePromise;
}
