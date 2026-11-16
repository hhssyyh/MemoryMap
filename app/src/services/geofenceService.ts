import * as Location from 'expo-location';

import { SQLiteBasePointRepository } from '../data/SQLiteBasePointRepository';
import type { BasePoint } from '../types/basePoint';
import { BASE_POINT_GEOFENCE_TASK } from '../tasks/geofenceTask';
import { requestBackgroundLocationPermission } from './locationPermissionService';

export async function registerActiveBasePointGeofence(): Promise<BasePoint> {
  const basePointRepository =
    new SQLiteBasePointRepository();

  const activeBasePoint =
    await basePointRepository.getActiveBasePoint();

  if (!activeBasePoint) {
    throw new Error(
      '활성 BasePoint가 없습니다. 먼저 기준 위치를 저장해주세요.',
    );
  }

  const locationServicesEnabled =
    await Location.hasServicesEnabledAsync();

  if (!locationServicesEnabled) {
    throw new Error(
      '휴대폰의 위치 서비스를 활성화해주세요.',
    );
  }

  const backgroundPermissionGranted =
    await requestBackgroundLocationPermission();

  if (!backgroundPermissionGranted) {
    throw new Error(
      '백그라운드 위치 권한이 필요합니다.',
    );
  }

  await Location.startGeofencingAsync(
    BASE_POINT_GEOFENCE_TASK,
    [
      {
        identifier: activeBasePoint.id,
        latitude: activeBasePoint.latitude,
        longitude: activeBasePoint.longitude,
        radius: activeBasePoint.radiusMeters,
        notifyOnEnter: true,
        notifyOnExit: true,
      },
    ],
  );

  return activeBasePoint;
}

export async function unregisterBasePointGeofence(): Promise<void> {
  const started =
    await Location.hasStartedGeofencingAsync(
      BASE_POINT_GEOFENCE_TASK,
    );

  if (!started) {
    return;
  }

  await Location.stopGeofencingAsync(
    BASE_POINT_GEOFENCE_TASK,
  );
}

export async function isBasePointGeofenceRegistered(): Promise<boolean> {
  return Location.hasStartedGeofencingAsync(
    BASE_POINT_GEOFENCE_TASK,
  );
}