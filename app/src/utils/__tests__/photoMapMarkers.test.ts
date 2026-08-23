import {
  buildPhotoMapMarkers,
  clusterPhotoMapMarkers,
} from "../photoMapMarkers";
import type { DiaryPoint } from "../../types/diary";
import type { PhotoLocationAssetCacheRecord } from "../../types/photoLocation";

const diaryPoints: DiaryPoint[] = [
  {
    id: "seoul-forest",
    location: "서울숲",
    coordinate: { latitude: 37.5444, longitude: 127.0374 },
    diaries: [
      {
        id: "diary-1",
        title: "서울숲 산책",
        date: "2026-06-21",
        summary: "산책",
        photoUri: "file:///diaries/diary-1/photos/cover.jpg",
        photoUris: [
          "file:///diaries/diary-1/photos/cover.jpg",
          "file:///diaries/diary-1/photos/second.jpg",
        ],
      },
    ],
  },
];

const baseAsset: PhotoLocationAssetCacheRecord = {
  assetId: "asset-1",
  uri: "file:///library/photo-1.jpg",
  createdTime: 1_782_012_000_000,
  modifiedTime: 1_782_012_000_000,
  width: 1200,
  height: 900,
  mediaType: "photo",
  latitude: 37.55,
  longitude: 127.04,
  sourceType: "device_library",
  syncStatus: "synced",
  lastSeenAt: "2026-06-21T12:00:00.000Z",
  updatedAt: "2026-06-21T12:00:00.000Z",
};

describe("photoMapMarkers", () => {
  it("builds diary and library photo markers", () => {
    const markers = buildPhotoMapMarkers({
      diaryPoints,
      libraryAssets: [baseAsset],
    });

    expect(markers).toHaveLength(2);
    expect(markers[0]).toMatchObject({
      id: "diary-seoul-forest",
      kind: "diary",
      photoCount: 2,
    });
    expect(markers[1]).toMatchObject({
      id: "library-photo-37.550000,127.040000",
      kind: "library_photo",
      assetIds: ["asset-1"],
      photoCount: 1,
    });
  });

  it("excludes library assets already attached to diaries", () => {
    const markers = buildPhotoMapMarkers({
      diaryPoints,
      libraryAssets: [
        baseAsset,
        {
          ...baseAsset,
          assetId: "asset-attached",
          uri: "file:///library/attached.jpg",
          attachedDiaryId: "diary-1",
        },
        {
          ...baseAsset,
          assetId: "asset-uri-match",
          uri: "file:///diaries/diary-1/photos/cover.jpg",
        },
      ],
    });

    expect(markers.filter((marker) => marker.kind === "library_photo")).toHaveLength(1);
  });

  it("groups nearby markers into cluster markers", () => {
    const markers = buildPhotoMapMarkers({
      diaryPoints,
      libraryAssets: [baseAsset],
    });
    const clustered = clusterPhotoMapMarkers(markers, { cellSizeDegrees: 1 });

    expect(clustered).toHaveLength(1);
    expect(clustered[0]).toMatchObject({
      kind: "cluster",
      diaryCount: 1,
      libraryPhotoCount: 1,
      totalCount: 2,
    });
  });
});
