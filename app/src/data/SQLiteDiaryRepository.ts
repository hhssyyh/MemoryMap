import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from './database';
import { copyDiaryPhoto, deleteDiaryDirectory, deleteManagedPhoto, isManagedDiaryPhoto } from './diaryPhotoFiles';
import type { DiaryRepository, SaveDiaryInput } from './DiaryRepository';
import type { DiaryEntry, DiaryPoint } from '../types/diary';

type DiaryRow = {
  id: string; trip_name: string | null; location: string; latitude: number | null; longitude: number | null;
  title: string; content: string; visited_at: string; route_order: number | null; tags_json: string;
  weather: string | null; temperature: string | null; time: string | null; is_saved: number;
};
type PhotoRow = { id: string; diary_id: string; file_uri: string; exif_latitude: number | null; exif_longitude: number | null; taken_at: string | null; sort_order: number; is_cover: number };
type LocationRow = { id: string; location: string; latitude: number; longitude: number };

const toDisplayDate = (visitedAt: string) => visitedAt.slice(0, 10);
const newId = () => `diary-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function parseTags(tagsJson: string) {
  try { return JSON.parse(tagsJson) as string[]; } catch { return []; }
}

function toEntry(row: DiaryRow, photos: PhotoRow[]): DiaryEntry {
  const orderedPhotos = photos.sort((a, b) => b.is_cover - a.is_cover || a.sort_order - b.sort_order);
  return {
    id: row.id, title: row.title, summary: row.content, date: toDisplayDate(row.visited_at), visitedAt: row.visited_at,
    location: row.location, latitude: row.latitude ?? undefined, longitude: row.longitude ?? undefined,
    tripName: row.trip_name ?? undefined, routeOrder: row.route_order ?? undefined,
    tags: parseTags(row.tags_json), weather: row.weather ?? undefined, temperature: row.temperature ?? undefined,
    time: row.time ?? undefined, isSaved: Boolean(row.is_saved), photoUri: orderedPhotos[0]?.file_uri,
    photoUris: orderedPhotos.map((photo) => photo.file_uri),
    photos: orderedPhotos.map((photo) => ({ id: photo.id, fileUri: photo.file_uri, exifLatitude: photo.exif_latitude ?? undefined, exifLongitude: photo.exif_longitude ?? undefined, takenAt: photo.taken_at ?? undefined, sortOrder: photo.sort_order, isCover: Boolean(photo.is_cover) })),
  };
}

export class SQLiteDiaryRepository implements DiaryRepository {
  private async database() { return getDatabase(); }

  private async entries(query = 'SELECT * FROM diaries', params: (string | number)[] = []) {
    const database = await this.database();
    const rows = await database.getAllAsync<DiaryRow>(query, ...params);
    if (!rows.length) return [];
    const photoRows = await database.getAllAsync<PhotoRow>(`SELECT * FROM diary_photos WHERE diary_id IN (${rows.map(() => '?').join(',')}) ORDER BY sort_order ASC`, ...rows.map((row) => row.id));
    return rows.map((row) => toEntry(row, photoRows.filter((photo) => photo.diary_id === row.id)));
  }

  async listPoints(): Promise<DiaryPoint[]> {
    const entries = await this.entries('SELECT * FROM diaries ORDER BY visited_at DESC, id DESC');
    const database = await this.database();
    const locations = await database.getAllAsync<LocationRow>('SELECT * FROM saved_locations ORDER BY location');
    const grouped = new Map<string, DiaryPoint>(locations.map((location) => [location.id, { id: location.id, location: location.location, coordinate: { latitude: location.latitude, longitude: location.longitude }, diaries: [] }]));
    entries.forEach((entry) => {
      if (entry.latitude === undefined || entry.longitude === undefined) return;
      const key = locations.find((location) => location.location === entry.location && location.latitude === entry.latitude && location.longitude === entry.longitude)?.id ?? `diary-location-${entry.id}`;
      const point = grouped.get(key) ?? { id: key, location: entry.location ?? '', coordinate: { latitude: entry.latitude, longitude: entry.longitude }, diaries: [] };
      point.diaries.push(entry);
      grouped.set(key, point);
    });
    return [...grouped.values()].filter((point) => point.diaries.length > 0);
  }

  async listSavedPoints(): Promise<DiaryPoint[]> {
    const database = await this.database();
    const locations = await database.getAllAsync<LocationRow>('SELECT * FROM saved_locations ORDER BY location');
    return locations.map((location) => ({ id: location.id, location: location.location, coordinate: { latitude: location.latitude, longitude: location.longitude }, diaries: [] }));
  }

  async getDiary(diaryId: string) { return (await this.entries('SELECT * FROM diaries WHERE id = ?', [diaryId]))[0] ?? null; }

  async createDiary(input: SaveDiaryInput) {
    const id = input.id ?? newId();
    await this.writeDiary({ ...input, id }, true);
    return id;
  }

  async updateDiary(input: SaveDiaryInput & { id: string }) { await this.writeDiary(input, false); }

  private async writeDiary(input: SaveDiaryInput & { id: string }, creating: boolean) {
    const database = await this.database();
    const previousPhotos = creating ? [] : await database.getAllAsync<PhotoRow>('SELECT * FROM diary_photos WHERE diary_id = ? ORDER BY sort_order', input.id);
    const copiedUris: string[] = [];
    const photos = input.photos.map((photo) => {
      if (isManagedDiaryPhoto(photo.fileUri)) return photo;
      const fileUri = copyDiaryPhoto(input.id, photo.fileUri);
      copiedUris.push(fileUri);
      return { ...photo, fileUri };
    });
    const latitude = creating ? input.latitude ?? photos[0]?.exifLatitude : input.latitude;
    const longitude = creating ? input.longitude ?? photos[0]?.exifLongitude : input.longitude;
    const now = new Date().toISOString();
    try {
      await database.withTransactionAsync(async () => {
        if (creating) {
          await database.runAsync('INSERT INTO diaries (id, trip_name, location, latitude, longitude, title, content, visited_at, route_order, tags_json, weather, temperature, time, is_saved, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', input.id, input.tripName ?? null, input.location, latitude ?? null, longitude ?? null, input.title, input.summary, input.visitedAt, input.routeOrder ?? null, JSON.stringify(input.tags ?? []), input.weather ?? null, input.temperature ?? null, input.time ?? null, input.isSaved ? 1 : 0, now, now);
        } else {
          await database.runAsync('UPDATE diaries SET trip_name = ?, location = ?, latitude = ?, longitude = ?, title = ?, content = ?, visited_at = ?, route_order = ?, tags_json = ?, weather = ?, temperature = ?, time = ?, is_saved = ?, updated_at = ? WHERE id = ?', input.tripName ?? null, input.location, input.latitude ?? null, input.longitude ?? null, input.title, input.summary, input.visitedAt, input.routeOrder ?? null, JSON.stringify(input.tags ?? []), input.weather ?? null, input.temperature ?? null, input.time ?? null, input.isSaved ? 1 : 0, now, input.id);
          await database.runAsync('DELETE FROM diary_photos WHERE diary_id = ?', input.id);
        }
        for (const [index, photo] of photos.entries()) {
          await database.runAsync('INSERT INTO diary_photos (id, diary_id, file_uri, exif_latitude, exif_longitude, taken_at, sort_order, is_cover, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', `${input.id}-photo-${index}-${now}`, input.id, photo.fileUri, photo.exifLatitude ?? null, photo.exifLongitude ?? null, photo.takenAt ?? null, index, index === 0 ? 1 : 0, now);
        }
      });
    } catch (error) {
      copiedUris.forEach(deleteManagedPhoto);
      throw error;
    }
    const retained = new Set(photos.map((photo) => photo.fileUri));
    previousPhotos.filter((photo) => !retained.has(photo.file_uri)).forEach((photo) => deleteManagedPhoto(photo.file_uri));
  }

  async deleteDiary(diaryId: string) {
    const database = await this.database();
    await database.runAsync('DELETE FROM diaries WHERE id = ?', diaryId);
    try { deleteDiaryDirectory(diaryId); } catch { /* orphan files are safe to remove on a later cleanup */ }
  }

  async toggleDiarySaved(diaryId: string) {
    const database = await this.database();
    await database.runAsync('UPDATE diaries SET is_saved = CASE is_saved WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?', new Date().toISOString(), diaryId);
  }

  async setDiaryCoverPhoto(diaryId: string, fileUri: string) {
    const database = await this.database();
    await database.withTransactionAsync(async () => {
      await database.runAsync('UPDATE diary_photos SET is_cover = 0 WHERE diary_id = ?', diaryId);
      const result = await database.runAsync('UPDATE diary_photos SET is_cover = 1 WHERE diary_id = ? AND file_uri = ?', diaryId, fileUri);
      if (!result.changes) throw new Error('Diary photo was not found.');
    });
  }

  async listDiariesByTrip(tripName: string) { return this.entries('SELECT * FROM diaries WHERE trip_name = ? ORDER BY route_order ASC, visited_at ASC, id ASC', [tripName]); }
  async listMapDiaries() { return this.entries('SELECT * FROM diaries WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY visited_at DESC, id DESC'); }
  async listRouteDiaries(tripName?: string) { return tripName ? this.listDiariesByTrip(tripName) : this.entries('SELECT * FROM diaries WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY route_order ASC, visited_at ASC, id ASC'); }
}
