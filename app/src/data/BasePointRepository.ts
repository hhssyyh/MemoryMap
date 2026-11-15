import type {
  BasePoint,
  SaveBasePointInput,
} from "../types/basePoint";

export interface BasePointRepository {
  listBasePoints(): Promise<BasePoint[]>;
  getBasePoint(id: string): Promise<BasePoint | null>;
  getActiveBasePoint(): Promise<BasePoint | null>;
  saveBasePoint(input: SaveBasePointInput): Promise<string>;
  setActiveBasePoint(id: string): Promise<void>;
  deleteBasePoint(id: string): Promise<void>;
}
/*화면과 지오펜스 로직을 거의 그대로 유지
중복 규칙, 로직 단순화, 서버 저장으로 확장*/