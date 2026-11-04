import type { DiaryEntry, DiaryPoint } from '../types/diary';

export type DiaryPhotoInput = {
  fileUri: string;
  exifLatitude?: number;
  exifLongitude?: number;
  takenAt?: string;
};

export type SaveDiaryInput = {
  id?: string;
  pointId?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  tripName?: string;
  title: string;
  summary: string;
  visitedAt: string;
  routeOrder?: number;
  tags?: string[];
  weather?: string;
  temperature?: string;
  time?: string;
  isSaved?: boolean;
  photos: DiaryPhotoInput[];
};

export interface DiaryRepository {
  listPoints(): Promise<DiaryPoint[]>;
  listSavedPoints(): Promise<DiaryPoint[]>;
  getDiary(diaryId: string): Promise<DiaryEntry | null>;
  createDiary(input: SaveDiaryInput): Promise<string>;
  updateDiary(input: SaveDiaryInput & { id: string }): Promise<void>;
  deleteDiary(diaryId: string): Promise<void>;
  toggleDiarySaved(diaryId: string): Promise<void>;
  setDiaryCoverPhoto(diaryId: string, fileUri: string): Promise<void>;
  listDiariesByTrip(tripName: string): Promise<DiaryEntry[]>;
  listMapDiaries(): Promise<DiaryEntry[]>;
  listRouteDiaries(tripName?: string): Promise<DiaryEntry[]>;
}
