import type { DiaryEntry } from "./diary";

export type DiaryCollection = {
  id: string;
  title: string;
  description?: string;
  coverPhotoUri?: string;
  diaryCount: number;
  dateRange?: {
    start: string;
    end: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type DiaryCollectionDetail = DiaryCollection & {
  diaries: DiaryEntry[];
};

export type CollectionDiaryLink = {
  collectionId: string;
  diaryId: string;
  sortOrder: number;
  addedAt: string;
};
