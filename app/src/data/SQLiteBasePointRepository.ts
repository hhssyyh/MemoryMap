import type { SQLiteDatabase } from "expo-sqlite";

import type { BasePointRepository } from "./BasePointRepository";
import { getDatabase } from "./database";
import type {
  BasePoint,
  SaveBasePointInput,
} from "../types/basePoint";

type BasePointRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const newBasePointId = () =>
  `base-point-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function toBasePoint(row: BasePointRow): BasePoint {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radius_meters,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateInput(input: SaveBasePointInput) {
  if (!input.name.trim()) {
    throw new Error("BasePoint 이름을 입력해야 합니다.");
  }

  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90
  ) {
    throw new Error("올바르지 않은 위도입니다.");
  }

  if (
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    throw new Error("올바르지 않은 경도입니다.");
  }

  if (
    !Number.isFinite(input.radiusMeters) ||
    input.radiusMeters <= 0
  ) {
    throw new Error("지오펜스 반경은 0보다 커야 합니다.");
  }
}

export class SQLiteBasePointRepository
  implements BasePointRepository
{
  private async database(): Promise<SQLiteDatabase> {
    return getDatabase();
  }

  async listBasePoints(): Promise<BasePoint[]> {
    const database = await this.database();

    const rows = await database.getAllAsync<BasePointRow>(
      `SELECT *
       FROM base_points
       ORDER BY is_active DESC, updated_at DESC`,
    );

    return rows.map(toBasePoint);
  }

  async getBasePoint(id: string): Promise<BasePoint | null> {
    const database = await this.database();

    const row = await database.getFirstAsync<BasePointRow>(
      `SELECT *
       FROM base_points
       WHERE id = ?`,
      id,
    );

    return row ? toBasePoint(row) : null;
  }

  async getActiveBasePoint(): Promise<BasePoint | null> {
    const database = await this.database();

    const row = await database.getFirstAsync<BasePointRow>(
      `SELECT *
       FROM base_points
       WHERE is_active = 1
       ORDER BY updated_at DESC
       LIMIT 1`,
    );

    return row ? toBasePoint(row) : null;
  }

  async saveBasePoint(
    input: SaveBasePointInput,
  ): Promise<string> {
    validateInput(input);

    const database = await this.database();
    const id = input.id ?? newBasePointId();
    const now = new Date().toISOString();
    const shouldActivate = input.isActive !== false;

    await database.withTransactionAsync(async () => {
      if (shouldActivate) {
        await database.runAsync(
          `UPDATE base_points
           SET is_active = 0,
               updated_at = ?
           WHERE id != ?`,
          now,
          id,
        );
      }

      await database.runAsync(
        `INSERT INTO base_points (
           id,
           name,
           latitude,
           longitude,
           radius_meters,
           is_active,
           created_at,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           latitude = excluded.latitude,
           longitude = excluded.longitude,
           radius_meters = excluded.radius_meters,
           is_active = excluded.is_active,
           updated_at = excluded.updated_at`,
        id,
        input.name.trim(),
        input.latitude,
        input.longitude,
        input.radiusMeters,
        shouldActivate ? 1 : 0,
        now,
        now,
      );
    });

    return id;
  }

  async setActiveBasePoint(id: string): Promise<void> {
    const database = await this.database();
    const now = new Date().toISOString();

    await database.withTransactionAsync(async () => {
      await database.runAsync(
        `UPDATE base_points
         SET is_active = 0,
             updated_at = ?`,
        now,
      );

      const result = await database.runAsync(
        `UPDATE base_points
         SET is_active = 1,
             updated_at = ?
         WHERE id = ?`,
        now,
        id,
      );

      if (result.changes === 0) {
        throw new Error("활성화할 BasePoint를 찾을 수 없습니다.");
      }
    });
  }

  async deleteBasePoint(id: string): Promise<void> {
    const database = await this.database();

    await database.runAsync(
      `DELETE FROM base_points
       WHERE id = ?`,
      id,
    );
  }
}
/* 여러 BasePoint를 저장할 수 있지만 활성 BasePoint는 하나만 사용하도록
Repository에서 제어한다. 나중에 이사를 하거나 집을 변경해도 이전 데이터를 보존*/