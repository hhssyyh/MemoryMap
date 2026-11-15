export type BasePoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveBasePointInput = {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive?: boolean;
};


/*latitude, longitude: 거점 중심 좌표
radiusMeters: 지오펜스 반경
isActive: 현재 감지에 사용하는 BasePoint인지
createdAt, updatedAt: 생성·수정 시각*/