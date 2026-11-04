import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "./database";
import type { CollectionRepository, SaveCollectionInput } from "./CollectionRepository";
import { SQLiteDiaryRepository } from "./SQLiteDiaryRepository";
import type { DiaryCollection, DiaryCollectionDetail } from "../types/collection";

type CollectionRow = {
  id: string;
  title: string;
  description: string | null;
  cover_photo_uri: string | null;
  diary_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

const newCollectionId = () =>
  `collection-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function toCollection(row: CollectionRow): DiaryCollection {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    coverPhotoUri: row.cover_photo_uri ?? undefined,
    diaryCount: row.diary_count,
    dateRange:
      row.start_date && row.end_date
        ? { start: row.start_date, end: row.end_date }
        : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteCollectionRepository implements CollectionRepository {
  constructor(private readonly diaryRepository = new SQLiteDiaryRepository()) {}

  private async database(): Promise<SQLiteDatabase> {
    return getDatabase();
  }

  async listCollections(): Promise<DiaryCollection[]> {
    const database = await this.database();
    const rows = await database.getAllAsync<CollectionRow>(
      `SELECT
         collections.*,
         COUNT(collection_diaries.diary_id) AS diary_count,
         MIN(diaries.visited_at) AS start_date,
         MAX(diaries.visited_at) AS end_date
       FROM collections
       LEFT JOIN collection_diaries
         ON collection_diaries.collection_id = collections.id
       LEFT JOIN diaries
         ON diaries.id = collection_diaries.diary_id
       GROUP BY collections.id
       ORDER BY collections.updated_at DESC, collections.title ASC`,
    );

    return rows.map(toCollection);
  }

  async getCollection(collectionId: string): Promise<DiaryCollectionDetail | null> {
    const database = await this.database();
    const row = await database.getFirstAsync<CollectionRow>(
      `SELECT
         collections.*,
         COUNT(collection_diaries.diary_id) AS diary_count,
         MIN(diaries.visited_at) AS start_date,
         MAX(diaries.visited_at) AS end_date
       FROM collections
       LEFT JOIN collection_diaries
         ON collection_diaries.collection_id = collections.id
       LEFT JOIN diaries
         ON diaries.id = collection_diaries.diary_id
       WHERE collections.id = ?
       GROUP BY collections.id`,
      collectionId,
    );

    if (!row) return null;

    const diaryRows = await database.getAllAsync<{ diary_id: string }>(
      `SELECT diary_id
       FROM collection_diaries
       WHERE collection_id = ?
       ORDER BY sort_order ASC, added_at ASC, diary_id ASC`,
      collectionId,
    );
    const diaries = (
      await Promise.all(
        diaryRows.map((diaryRow) => this.diaryRepository.getDiary(diaryRow.diary_id)),
      )
    ).filter((diary) => diary !== null);

    return {
      ...toCollection(row),
      diaries,
    };
  }

  async createCollection(input: SaveCollectionInput): Promise<string> {
    const database = await this.database();
    const id = input.id ?? newCollectionId();
    const now = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO collections (
         id, title, description, cover_photo_uri, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      input.title.trim(),
      input.description?.trim() || null,
      input.coverPhotoUri ?? null,
      now,
      now,
    );

    return id;
  }

  async updateCollection(input: SaveCollectionInput & { id: string }): Promise<void> {
    const database = await this.database();
    await database.runAsync(
      `UPDATE collections
       SET title = ?,
           description = ?,
           cover_photo_uri = ?,
           updated_at = ?
       WHERE id = ?`,
      input.title.trim(),
      input.description?.trim() || null,
      input.coverPhotoUri ?? null,
      new Date().toISOString(),
      input.id,
    );
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const database = await this.database();
    await database.runAsync("DELETE FROM collections WHERE id = ?", collectionId);
  }

  async listCollectionIdsForDiary(diaryId: string): Promise<string[]> {
    const database = await this.database();
    const rows = await database.getAllAsync<{ collection_id: string }>(
      `SELECT collection_id
       FROM collection_diaries
       WHERE diary_id = ?
       ORDER BY sort_order ASC, added_at ASC, collection_id ASC`,
      diaryId,
    );

    return rows.map((row) => row.collection_id);
  }

  private async nextSortOrder(database: SQLiteDatabase, collectionId: string) {
    const row = await database.getFirstAsync<{ next_sort_order: number | null }>(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM collection_diaries WHERE collection_id = ?",
      collectionId,
    );
    return row?.next_sort_order ?? 1;
  }

  async addDiary(collectionId: string, diaryId: string, sortOrder?: number): Promise<void> {
    const database = await this.database();
    const now = new Date().toISOString();
    const nextSortOrder = sortOrder ?? await this.nextSortOrder(database, collectionId);
    await database.runAsync(
      `INSERT INTO collection_diaries (
         collection_id, diary_id, sort_order, added_at
       ) VALUES (?, ?, ?, ?)
       ON CONFLICT(collection_id, diary_id) DO UPDATE SET
         sort_order = excluded.sort_order`,
      collectionId,
      diaryId,
      nextSortOrder,
      now,
    );
    await database.runAsync(
      "UPDATE collections SET updated_at = ? WHERE id = ?",
      now,
      collectionId,
    );
  }

  async removeDiary(collectionId: string, diaryId: string): Promise<void> {
    const database = await this.database();
    await database.withTransactionAsync(async () => {
      await database.runAsync(
        "DELETE FROM collection_diaries WHERE collection_id = ? AND diary_id = ?",
        collectionId,
        diaryId,
      );
      await database.runAsync(
        "UPDATE collections SET updated_at = ? WHERE id = ?",
        new Date().toISOString(),
        collectionId,
      );
    });
  }

  async replaceDiaryCollections(diaryId: string, collectionIds: string[]): Promise<void> {
    const database = await this.database();
    const now = new Date().toISOString();
    await database.withTransactionAsync(async () => {
      const previousRows = await database.getAllAsync<{ collection_id: string }>(
        "SELECT collection_id FROM collection_diaries WHERE diary_id = ?",
        diaryId,
      );
      await database.runAsync(
        "DELETE FROM collection_diaries WHERE diary_id = ?",
        diaryId,
      );

      for (const [index, collectionId] of collectionIds.entries()) {
        const nextSortOrder =
          collectionIds.length === 1
            ? await this.nextSortOrder(database, collectionId)
            : index + 1;
        await database.runAsync(
          `INSERT INTO collection_diaries (
             collection_id, diary_id, sort_order, added_at
           ) VALUES (?, ?, ?, ?)`,
          collectionId,
          diaryId,
          nextSortOrder,
          now,
        );
      }

      const touchedCollectionIds = new Set([
        ...previousRows.map((row) => row.collection_id),
        ...collectionIds,
      ]);
      for (const collectionId of touchedCollectionIds) {
        await database.runAsync(
          "UPDATE collections SET updated_at = ? WHERE id = ?",
          now,
          collectionId,
        );
      }
    });
  }

  async reorderDiaries(collectionId: string, diaryIds: string[]): Promise<void> {
    const database = await this.database();
    const now = new Date().toISOString();
    await database.withTransactionAsync(async () => {
      for (const [index, diaryId] of diaryIds.entries()) {
        await database.runAsync(
          `UPDATE collection_diaries
           SET sort_order = ?
           WHERE collection_id = ? AND diary_id = ?`,
          index + 1,
          collectionId,
          diaryId,
        );
      }
      await database.runAsync(
        "UPDATE collections SET updated_at = ? WHERE id = ?",
        now,
        collectionId,
      );
    });
  }
}
