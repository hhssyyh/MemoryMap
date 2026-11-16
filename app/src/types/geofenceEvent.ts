export type GeofenceTransitionType = 'ENTER' | 'EXIT';

export type GeofenceEventSource =
  | 'BACKGROUND_GEOFENCE'
  | 'FOREGROUND_DISTANCE'
  | 'MANUAL_TEST';

export type GeofenceEvent = {
  id: string;
  basePointId: string | null;
  transitionType: GeofenceTransitionType;
  occurredAt: string;
  latitude: number | null;
  longitude: number | null;
  source: GeofenceEventSource;
  createdAt: string;
};

export type SaveGeofenceEventInput = {
  id?: string;
  basePointId: string;
  transitionType: GeofenceTransitionType;
  occurredAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  source: GeofenceEventSource;
};