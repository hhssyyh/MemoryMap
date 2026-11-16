import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { SQLiteGeofenceEventRepository } from '../data/SQLiteGeofenceEventRepository';
import type { GeofenceTransitionType } from '../types/geofenceEvent';

export const BASE_POINT_GEOFENCE_TASK =
  'base-point-geofence-task';

type GeofenceTaskData = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

TaskManager.defineTask<GeofenceTaskData>(
  BASE_POINT_GEOFENCE_TASK,
  async ({ data, error }) => {
    if (error) {
      console.error(
        '[BasePointGeofenceTask] 지오펜스 이벤트 오류:',
        error.message,
      );
      return;
    }

    if (!data) {
      return;
    }

    const { eventType, region } = data;
const basePointId = region.identifier;

    if (!basePointId) {
        console.error(
            '[BasePointGeofenceTask] BasePoint 식별자가 없습니다.',
        );
        return;
    }
    let transitionType: GeofenceTransitionType;

    if (eventType === Location.GeofencingEventType.Enter) {
      transitionType = 'ENTER';
    } else if (eventType === Location.GeofencingEventType.Exit) {
      transitionType = 'EXIT';
    } else {
      return;
    }

    try {
      const repository =
        new SQLiteGeofenceEventRepository();

      await repository.saveEvent({
        basePointId,
        transitionType,
        occurredAt: new Date().toISOString(),
        latitude: null,
        longitude: null,
        source: 'BACKGROUND_GEOFENCE',
    });
    } catch (taskError) {
      console.error(
        '[BasePointGeofenceTask] 이벤트 저장 실패:',
        taskError,
      );
    }
  },
);