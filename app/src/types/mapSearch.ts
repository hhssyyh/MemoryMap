export type MapSearchCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapSearchSuggestion = {
  id: string;
  mapboxId: string;
  name: string;
  address?: string;
  featureType?: string;
};

export type MapSearchPlace = {
  id: string;
  mapboxId: string;
  name: string;
  address?: string;
  coordinate: MapSearchCoordinate;
};
