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
