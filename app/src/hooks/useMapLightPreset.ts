import { useEffect, useState } from 'react';

type MapLightPreset = 'dawn' | 'day' | 'dusk' | 'night';

function getLightPreset(date = new Date()): MapLightPreset {
  const hour = date.getHours();

  if (hour >= 5 && hour < 8) {
    return 'dawn';
  }

  if (hour >= 8 && hour < 18) {
    return 'day';
  }

  if (hour >= 18 && hour < 21) {
    return 'dusk';
  }

  return 'night';
}

export function useMapLightPreset() {
  const [lightPreset, setLightPreset] = useState<MapLightPreset>(getLightPreset);

  useEffect(() => {
    const interval = setInterval(() => {
      setLightPreset(getLightPreset());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  return lightPreset;
}
