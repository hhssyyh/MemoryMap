import type { DiaryCollection, DiaryCollectionDetail } from "../types/collection";

export type SaveCollectionInput = {
  id?: string;
  title: string;
  description?: string;
  coverPhotoUri?: string;
};

export interface CollectionRepository {
  listCollections(): Promise<DiaryCollection[]>;
  getCollection(collectionId: string): Promise<DiaryCollectionDetail | null>;
  createCollection(input: SaveCollectionInput): Promise<string>;
  updateCollection(input: SaveCollectionInput & { id: string }): Promise<void>;
  deleteCollection(collectionId: string): Promise<void>;
  listCollectionIdsForDiary(diaryId: string): Promise<string[]>;
  addDiary(collectionId: string, diaryId: string, sortOrder?: number): Promise<void>;
  removeDiary(collectionId: string, diaryId: string): Promise<void>;
  replaceDiaryCollections(diaryId: string, collectionIds: string[]): Promise<void>;
  reorderDiaries(collectionId: string, diaryIds: string[]): Promise<void>;
}
