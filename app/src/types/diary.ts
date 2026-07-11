export type DiaryEntry = {
  id: string;
  title: string;
  date: string;
  summary: string;
  photoUri?: string;
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
