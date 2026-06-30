import type { DiaryPoint } from '../types/diary';

export const sampleDiaryPoints: DiaryPoint[] = [
  {
    id: 'seoul-forest',
    location: '서울숲',
    coordinate: { latitude: 37.5444, longitude: 127.0374 },
    diaries: [
      {
        id: 'seoul-forest-walk',
        title: '햇살 좋은 산책',
        date: '2026. 06. 21',
        emoji: '🌿',
        summary: '초여름 햇살을 받으며 천천히 걸었던 오후.',
      },
      {
        id: 'seoul-forest-picnic',
        title: '나무 아래 작은 피크닉',
        date: '2026. 05. 18',
        emoji: '🧺',
        summary: '좋아하는 간식과 음악을 챙겨 쉬어간 날.',
      },
    ],
  },
  {
    id: 'seongsu',
    location: '성수동',
    coordinate: { latitude: 37.5446, longitude: 127.056 },
    diaries: [
      {
        id: 'seongsu-coffee',
        title: '오후의 커피',
        date: '2026. 06. 14',
        emoji: '☕',
        summary: '골목 안 조용한 카페에서 보낸 여유로운 시간.',
      },
      {
        id: 'seongsu-exhibition',
        title: '골목에서 만난 전시',
        date: '2026. 04. 28',
        emoji: '🎨',
        summary: '우연히 발견한 작은 전시가 오래 기억에 남았다.',
      },
    ],
  },
  {
    id: 'hangang',
    location: '뚝섬 한강공원',
    coordinate: { latitude: 37.5293, longitude: 127.0699 },
    diaries: [
      {
        id: 'hangang-sunset',
        title: '한강의 저녁',
        date: '2026. 05. 30',
        emoji: '🌇',
        summary: '강 건너로 천천히 내려앉는 노을을 바라봤다.',
      },
      {
        id: 'hangang-bicycle',
        title: '바람을 따라 달리기',
        date: '2026. 04. 12',
        emoji: '🚲',
        summary: '선선한 강바람을 맞으며 자전거로 달린 오후.',
      },
    ],
  },
];
