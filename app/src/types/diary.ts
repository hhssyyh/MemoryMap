export type DiaryEntry = {
  id: string;
  title: string;
  date: string;
  summary: string;
  photoUri?: string;
  photoUris?: string[];
  tags?: string[];
  weather?: string;
  temperature?: string;
  time?: string;
  isSaved?: boolean;
  visitedAt?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  tripName?: string;
  routeOrder?: number;
  photos?: DiaryPhoto[];
};

export type DiaryPhoto = {
  id: string;
  fileUri: string;
  exifLatitude?: number;
  exifLongitude?: number;
  takenAt?: string;
  sortOrder: number;
  isCover: boolean;
};

export type DiaryPoint = {
  id: string;
  location: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  diaries: DiaryEntry[];
};
