import type {
  GeofenceEvent,
  SaveGeofenceEventInput,
} from '../types/geofenceEvent';

export interface GeofenceEventRepository {
  saveEvent(input: SaveGeofenceEventInput): Promise<string>;
  getRecentEvents(limit?: number): Promise<GeofenceEvent[]>;
  deleteAllEvents(): Promise<void>;
}