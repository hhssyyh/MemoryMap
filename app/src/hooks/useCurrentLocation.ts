import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type CurrentCoordinate = {
  latitude: number;
  longitude: number;
};

export function useCurrentLocation() {
  const [coordinate, setCoordinate] = useState<CurrentCoordinate | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = useCallback(async () => {
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const denied = permission.status !== Location.PermissionStatus.GRANTED;
      setPermissionDenied(denied);

      if (denied) {
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoordinate({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch {
      setCoordinate(null);
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    let subscription: Location.LocationSubscription | undefined;

    async function startTracking() {
      await requestLocation();

      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (location) => {
          if (!isActive) {
            return;
          }
          setCoordinate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        },
      );

      if (!isActive) {
        subscription.remove();
      }
    }

    void startTracking();

    return () => {
      isActive = false;
      subscription?.remove();
    };
  }, [requestLocation]);

  return { coordinate, isLocating, permissionDenied, requestLocation };
}
