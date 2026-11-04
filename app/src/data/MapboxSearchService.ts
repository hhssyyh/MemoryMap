import type {
  MapSearchCoordinate,
  MapSearchPlace,
  MapSearchSuggestion,
} from "../types/mapSearch";

type MapboxSuggestResponse = {
  suggestions?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    feature_type?: string;
  }[];
};

type MapboxRetrieveResponse = {
  features?: {
    geometry?: {
      coordinates?: [number, number];
    };
    properties?: {
      mapbox_id?: string;
      name?: string;
      full_address?: string;
      place_formatted?: string;
      coordinates?: {
        latitude?: number;
        longitude?: number;
      };
    };
  }[];
};

type SearchOptions = {
  proximity?: MapSearchCoordinate | null;
  sessionToken: string;
  signal?: AbortSignal;
};

const searchBoxBaseURL = "https://api.mapbox.com/search/searchbox/v1";
const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

function getAccessToken() {
  const token = accessToken?.trim();
  if (!token) {
    throw new Error("Mapbox access token is missing.");
  }

  return token;
}

function appendRequiredParams(params: URLSearchParams, options: SearchOptions) {
  params.set("access_token", getAccessToken());
  params.set("language", "ko");
  params.set("session_token", options.sessionToken);
}

function appendSuggestParams(params: URLSearchParams, options: SearchOptions) {
  appendRequiredParams(params, options);
  params.set("limit", "6");

  if (options.proximity) {
    params.set(
      "proximity",
      `${options.proximity.longitude},${options.proximity.latitude}`,
    );
  }
}

async function parseMapboxResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Mapbox search failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export function createMapSearchSessionToken() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    const next = value === "x" ? random : (random & 0x3) | 0x8;
    return next.toString(16);
  });
}

export async function suggestMapPlaces(
  query: string,
  options: SearchOptions,
): Promise<MapSearchSuggestion[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams();
  params.set("q", trimmedQuery);
  appendSuggestParams(params, options);

  const response = await fetch(`${searchBoxBaseURL}/suggest?${params}`, {
    signal: options.signal,
  });
  const payload = await parseMapboxResponse<MapboxSuggestResponse>(response);

  return (payload.suggestions ?? [])
    .filter((suggestion) => suggestion.mapbox_id && suggestion.name)
    .map((suggestion) => ({
      id: suggestion.mapbox_id ?? "",
      mapboxId: suggestion.mapbox_id ?? "",
      name: suggestion.name ?? "",
      address: suggestion.full_address ?? suggestion.place_formatted,
      featureType: suggestion.feature_type,
    }));
}

export async function retrieveMapPlace(
  suggestion: MapSearchSuggestion,
  options: SearchOptions,
): Promise<MapSearchPlace> {
  const params = new URLSearchParams();
  appendRequiredParams(params, options);

  const response = await fetch(
    `${searchBoxBaseURL}/retrieve/${encodeURIComponent(suggestion.mapboxId)}?${params}`,
    { signal: options.signal },
  );
  const payload = await parseMapboxResponse<MapboxRetrieveResponse>(response);
  const feature = payload.features?.[0];
  const geometryCoordinates = feature?.geometry?.coordinates;
  const propertyCoordinates = feature?.properties?.coordinates;
  const longitude = geometryCoordinates?.[0] ?? propertyCoordinates?.longitude;
  const latitude = geometryCoordinates?.[1] ?? propertyCoordinates?.latitude;

  if (longitude === undefined || latitude === undefined) {
    throw new Error("Mapbox search result has no coordinates.");
  }

  return {
    id: suggestion.id,
    mapboxId: suggestion.mapboxId,
    name: feature?.properties?.name ?? suggestion.name,
    address:
      feature?.properties?.full_address ??
      feature?.properties?.place_formatted ??
      suggestion.address,
    coordinate: {
      longitude,
      latitude,
    },
  };
}
