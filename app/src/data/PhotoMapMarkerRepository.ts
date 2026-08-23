import { PhotoLocationRepository } from "./PhotoLocationRepository";
import { SQLiteDiaryRepository } from "./SQLiteDiaryRepository";
import {
  buildPhotoMapMarkers,
  clusterPhotoMapMarkers,
} from "../utils/photoMapMarkers";
import type { PhotoMapMarker } from "../types/photoLocation";

type ListPhotoMapMarkersOptions = {
  includeClusters?: boolean;
  libraryAssetLimit?: number;
};

export class PhotoMapMarkerRepository {
  constructor(
    private readonly diaryRepository = new SQLiteDiaryRepository(),
    private readonly photoLocationRepository = new PhotoLocationRepository(),
  ) {}

  async listMarkers({
    includeClusters = false,
    libraryAssetLimit,
  }: ListPhotoMapMarkersOptions = {}): Promise<PhotoMapMarker[]> {
    const [diaryPoints, libraryAssets] = await Promise.all([
      this.diaryRepository.listPoints(),
      this.photoLocationRepository.listLocatedLibraryAssets(libraryAssetLimit),
    ]);
    const markers = buildPhotoMapMarkers({ diaryPoints, libraryAssets });

    return includeClusters ? clusterPhotoMapMarkers(markers) : markers;
  }
}
