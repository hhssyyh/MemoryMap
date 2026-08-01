import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { SQLiteDiaryRepository } from '../data/SQLiteDiaryRepository';
import type { DiaryEntry, DiaryPoint } from '../types/diary';

type NewDiary = Omit<DiaryEntry, 'id'> & { pointId: string };
type DiaryUpdate = Omit<DiaryEntry, 'id'> & { diaryId: string; pointId: string };

type DiaryContextValue = {
  points: DiaryPoint[];
  savedPoints: DiaryPoint[];
  isLoading: boolean;
  addDiary: (diary: NewDiary) => Promise<void>;
  updateDiary: (diary: DiaryUpdate) => Promise<void>;
  deleteDiary: (diaryId: string) => Promise<void>;
  toggleDiarySaved: (diaryId: string) => Promise<void>;
  setDiaryCoverPhoto: (diaryId: string, fileUri: string) => Promise<void>;
  getDiary: (diaryId: string) => Promise<DiaryEntry | null>;
  refresh: () => Promise<void>;
};

const DiaryContext = createContext<DiaryContextValue | null>(null);
const repository = new SQLiteDiaryRepository();

const toVisitedAt = (date?: string, time?: string) => {
  if (date?.match(/^\d{4}-\d{2}-\d{2}$/)) return `${date}T${time ?? '12:00'}:00.000Z`;
  return new Date().toISOString();
};

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState<DiaryPoint[]>([]);
  const [savedPoints, setSavedPoints] = useState<DiaryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refresh = useCallback(async () => {
    const [nextPoints, nextSavedPoints] = await Promise.all([repository.listPoints(), repository.listSavedPoints()]);
    setPoints(nextPoints);
    setSavedPoints(nextSavedPoints);
  }, []);

  useEffect(() => {
    void refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const value = useMemo<DiaryContextValue>(() => ({
    points,
    savedPoints,
    isLoading,
    refresh,
    addDiary: async ({ pointId, ...diary }) => {
      const point = savedPoints.find((item) => item.id === pointId);
      if (!point) throw new Error('Selected diary location was not found.');
      const photoUris = diary.photoUris?.length ? diary.photoUris : diary.photoUri ? [diary.photoUri] : [];
      await repository.createDiary({
        location: point.location,
        latitude: point.coordinate.latitude,
        longitude: point.coordinate.longitude,
        title: diary.title,
        summary: diary.summary,
        visitedAt: diary.visitedAt ?? toVisitedAt(diary.date, diary.time),
        tags: diary.tags,
        weather: diary.weather,
        temperature: diary.temperature,
        time: diary.time,
        isSaved: diary.isSaved,
        photos: photoUris.map((fileUri) => ({ fileUri })),
      });
      await refresh();
    },
    updateDiary: async ({ diaryId, pointId, ...updatedDiary }) => {
      const existing = points.flatMap((point) => point.diaries).find((diary) => diary.id === diaryId);
      const point = points.find((item) => item.id === pointId);
      if (!existing || !point) throw new Error('Diary to update was not found.');
      const photoUris = updatedDiary.photoUris?.length ? updatedDiary.photoUris : updatedDiary.photoUri ? [updatedDiary.photoUri] : [];
      await repository.updateDiary({
        id: diaryId,
        location: point.location,
        latitude: existing.latitude ?? point.coordinate.latitude,
        longitude: existing.longitude ?? point.coordinate.longitude,
        tripName: existing.tripName,
        title: updatedDiary.title,
        summary: updatedDiary.summary,
        visitedAt: updatedDiary.visitedAt ?? existing.visitedAt ?? toVisitedAt(updatedDiary.date, updatedDiary.time),
        routeOrder: existing.routeOrder,
        tags: updatedDiary.tags,
        weather: existing.weather,
        temperature: existing.temperature,
        time: updatedDiary.time ?? existing.time,
        isSaved: existing.isSaved,
        photos: photoUris.map((fileUri) => ({ fileUri })),
      });
      await refresh();
    },
    deleteDiary: async (diaryId) => { await repository.deleteDiary(diaryId); await refresh(); },
    toggleDiarySaved: async (diaryId) => { await repository.toggleDiarySaved(diaryId); await refresh(); },
    setDiaryCoverPhoto: async (diaryId, fileUri) => { await repository.setDiaryCoverPhoto(diaryId, fileUri); await refresh(); },
    getDiary: (diaryId) => repository.getDiary(diaryId),
  }), [isLoading, points, refresh, savedPoints]);

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiaries() {
  const context = useContext(DiaryContext);
  if (!context) throw new Error('useDiaries must be used inside DiaryProvider');
  return context;
}
