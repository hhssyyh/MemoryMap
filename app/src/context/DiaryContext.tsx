import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { sampleDiaryPoints } from '../constants/sampleDiaryPoints';
import type { DiaryEntry, DiaryPoint } from '../types/diary';

type NewDiary = Omit<DiaryEntry, 'id'> & { pointId: string };
type DiaryUpdate = Omit<DiaryEntry, 'id'> & { diaryId: string; pointId: string };

type DiaryContextValue = {
  points: DiaryPoint[];
  addDiary: (diary: NewDiary) => void;
  updateDiary: (diary: DiaryUpdate) => void;
  deleteDiary: (diaryId: string) => void;
  toggleDiarySaved: (diaryId: string) => void;
};

const DiaryContext = createContext<DiaryContextValue | null>(null);

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState<DiaryPoint[]>(sampleDiaryPoints);

  const value = useMemo<DiaryContextValue>(
    () => ({
      points,
      addDiary: ({ pointId, ...diary }) => {
        const entry = { ...diary, id: `diary-${Date.now()}` };
        setPoints((current) =>
          current.map((point) =>
            point.id === pointId
              ? { ...point, diaries: [entry, ...point.diaries] }
              : point,
          ),
        );
      },
      updateDiary: ({ diaryId, pointId, ...updatedDiary }) => {
        setPoints((current) => {
          const existingDiary = current.flatMap((point) => point.diaries).find((diary) => diary.id === diaryId);
          if (!existingDiary) return current;
          const diary = { ...existingDiary, ...updatedDiary, id: diaryId };
          return current.map((point) => ({
            ...point,
            diaries: point.id === pointId
              ? [diary, ...point.diaries.filter((item) => item.id !== diaryId)]
              : point.diaries.filter((item) => item.id !== diaryId),
          }));
        });
      },
      deleteDiary: (diaryId) => {
        setPoints((current) =>
          current.map((point) => ({
            ...point,
            diaries: point.diaries.filter((diary) => diary.id !== diaryId),
          })),
        );
      },
      toggleDiarySaved: (diaryId) => {
        setPoints((current) =>
          current.map((point) => ({
            ...point,
            diaries: point.diaries.map((diary) =>
              diary.id === diaryId ? { ...diary, isSaved: !diary.isSaved } : diary,
            ),
          })),
        );
      },
    }),
    [points],
  );

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiaries() {
  const context = useContext(DiaryContext);

  if (!context) {
    throw new Error('useDiaries must be used inside DiaryProvider');
  }

  return context;
}
