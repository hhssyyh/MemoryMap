export type DiaryEntry = {
  id: string;
  title: string;
  date: string;
  emoji: string;
  summary: string;
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
