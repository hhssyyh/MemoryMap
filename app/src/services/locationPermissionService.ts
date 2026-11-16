import * as Location from 'expo-location';

export type LocationPermissionState = {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  canAskForegroundAgain: boolean;
  canAskBackgroundAgain: boolean;
};

export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  const [foreground, background] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);

  return {
    foregroundGranted:
      foreground.status === Location.PermissionStatus.GRANTED,
    backgroundGranted:
      background.status === Location.PermissionStatus.GRANTED,
    canAskForegroundAgain: foreground.canAskAgain,
    canAskBackgroundAgain: background.canAskAgain,
  };
}

export async function requestForegroundLocationPermission(): Promise<boolean> {
  const currentPermission =
    await Location.getForegroundPermissionsAsync();

  if (
    currentPermission.status ===
    Location.PermissionStatus.GRANTED
  ) {
    return true;
  }

  const requestedPermission =
    await Location.requestForegroundPermissionsAsync();

  return (
    requestedPermission.status ===
    Location.PermissionStatus.GRANTED
  );
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  const foregroundGranted =
    await requestForegroundLocationPermission();

  if (!foregroundGranted) {
    return false;
  }

  const currentPermission =
    await Location.getBackgroundPermissionsAsync();

  if (
    currentPermission.status ===
    Location.PermissionStatus.GRANTED
  ) {
    return true;
  }

  const requestedPermission =
    await Location.requestBackgroundPermissionsAsync();

  return (
    requestedPermission.status ===
    Location.PermissionStatus.GRANTED
  );
}