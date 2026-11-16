import type { SQLiteDatabase } from 'expo-sqlite';

import type { GeofenceEventRepository } from './GeofenceEventRepository';
import { getDatabase } from './database';
import type {
  GeofenceEvent,
  GeofenceEventSource,
  GeofenceTransitionType,
  SaveGeofenceEventInput,
} from '../types/geofenceEvent';

type GeofenceEventRow = {
  id: string;
  base_point_id: string | null;
  transition_type: GeofenceTransitionType;
  occurred_at: string;
  latitude: number | null;
  longitude: number | null;
  source: GeofenceEventSource;
  created_at: string;
};

const newGeofenceEventId = () =>
  `geofence-event-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

function toGeofenceEvent(row: GeofenceEventRow): GeofenceEvent {
  return {
    id: row.id,
    basePointId: row.base_point_id,
    transitionType: row.transition_type,
    occurredAt: row.occurred_at,
    latitude: row.latitude,
    longitude: row.longitude,
    source: row.source,
    createdAt: row.created_at,
  };
}

function validateCoordinate(
  value: number | null | undefined,
  minimum: number,
  maximum: number,
  name: string,
) {
  if (value === null || value === undefined) {
    return;
  }

  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`올바르지 않은 ${name}입니다.`);
  }
}

function validateInput(input: SaveGeofenceEventInput) {
  if (!input.basePointId.trim()) {
    throw new Error('BasePoint ID가 필요합니다.');
  }

  if (
    input.transitionType !== 'ENTER' &&
    input.transitionType !== 'EXIT'
  ) {
    throw new Error('올바르지 않은 지오펜스 이벤트입니다.');
  }

  validateCoordinate(input.latitude, -90, 90, '위도');
  validateCoordinate(input.longitude, -180, 180, '경도');
}

export class SQLiteGeofenceEventRepository
  implements GeofenceEventRepository
{
  private async database(): Promise<SQLiteDatabase> {
    return getDatabase();
  }

  async saveEvent(input: SaveGeofenceEventInput): Promise<string> {
    validateInput(input);

    const database = await this.database();
    const id = input.id ?? newGeofenceEventId();
    const createdAt = new Date().toISOString();
    const occurredAt = input.occurredAt ?? createdAt;

    await database.runAsync(
      `INSERT INTO geofence_events (
         id,
         base_point_id,
         transition_type,
         occurred_at,
         latitude,
         longitude,
         source,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.basePointId,
      input.transitionType,
      occurredAt,
      input.latitude ?? null,
      input.longitude ?? null,
      input.source,
      createdAt,
    );

    return id;
  }

  async getRecentEvents(limit = 50): Promise<GeofenceEvent[]> {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error('조회 개수는 1 이상의 정수여야 합니다.');
    }

    const database = await this.database();

    const rows = await database.getAllAsync<GeofenceEventRow>(
      `SELECT *
       FROM geofence_events
       ORDER BY occurred_at DESC
       LIMIT ?`,
      limit,
    );

    return rows.map(toGeofenceEvent);
  }

  async deleteAllEvents(): Promise<void> {
    const database = await this.database();

    await database.runAsync('DELETE FROM geofence_events');
  }
}