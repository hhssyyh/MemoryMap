import {
  HANDWRITING_SCHEMA_VERSION,
  type HandwritingDocument,
  type HandwritingLayer,
  type HandwritingPage,
  type ImageAssetReference,
  type PageBackground,
  type QuarterTurn,
} from '../types/handwriting';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function number(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function string(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function assetReference(
  value: unknown,
  fallbackUri: unknown,
  width: unknown,
  height: unknown,
): ImageAssetReference {
  const source = record(value);
  const legacyUri = string(fallbackUri);
  return {
    originalUri: string(source.originalUri, legacyUri),
    previewUri: string(source.previewUri, legacyUri),
    pixelWidth: number(source.pixelWidth, number(width, 0)),
    pixelHeight: number(source.pixelHeight, number(height, 0)),
  };
}

function normalizeBackground(value: unknown): PageBackground {
  const source = record(value);
  if (source.type === 'image') {
    const rawRotation = number(source.rotation, 0);
    const rotation: QuarterTurn =
      rawRotation === 90 || rawRotation === 180 || rawRotation === 270 ? rawRotation : 0;
    return {
      type: 'image',
      asset: assetReference(source.asset, source.assetUri, 0, 0),
      rotation,
    };
  }
  const preset = source.preset;
  return {
    type: 'preset',
    preset:
      preset === 'lined' || preset === 'grid' || preset === 'dot' || preset === 'cream'
        ? preset
        : 'blank',
  };
}

function normalizeLayer(value: unknown): HandwritingLayer | null {
  const source = record(value);
  const transform = record(source.transform);
  const common = {
    id: string(source.id),
    name: string(source.name),
    transform: {
      x: number(transform.x, 0),
      y: number(transform.y, 0),
      scaleX: number(transform.scaleX, 1),
      scaleY: number(transform.scaleY, 1),
      rotation: number(transform.rotation, 0),
    },
    hidden: Boolean(source.hidden),
    locked: Boolean(source.locked),
  };
  if (source.type === 'ink') {
    return { ...common, type: 'ink', strokes: Array.isArray(source.strokes) ? source.strokes as never[] : [] };
  }
  if (source.type === 'image') {
    const width = number(source.width, 1);
    const height = number(source.height, 1);
    return {
      ...common,
      type: 'image',
      asset: assetReference(source.asset, source.assetUri, width, height),
      width,
      height,
    };
  }
  if (source.type === 'sticker') {
    return {
      ...common,
      type: 'sticker',
      stickerId: string(source.stickerId, 'star'),
      width: number(source.width, 1),
      height: number(source.height, 1),
    };
  }
  return null;
}

function normalizePage(value: unknown): HandwritingPage {
  const source = record(value);
  const width = number(source.width, 900);
  const height = number(source.height, 1200);
  const contentRevision = Math.max(0, number(source.contentRevision, 0));
  const thumbnailUri = typeof source.thumbnailUri === 'string' ? source.thumbnailUri : undefined;
  const thumbnailRevision = typeof source.thumbnailRevision === 'number'
    ? Math.max(0, source.thumbnailRevision)
    : thumbnailUri
      ? contentRevision
      : undefined;
  return {
    id: string(source.id),
    width,
    height,
    orientation: source.orientation === 'landscape' || width > height ? 'landscape' : 'portrait',
    contentRevision,
    thumbnailRevision,
    thumbnailDirty: typeof source.thumbnailDirty === 'boolean'
      ? source.thumbnailDirty
      : thumbnailRevision !== contentRevision,
    background: normalizeBackground(source.background),
    layers: (Array.isArray(source.layers) ? source.layers : [])
      .map(normalizeLayer)
      .filter((layer): layer is HandwritingLayer => layer !== null),
    thumbnailUri,
  };
}

/** Converts persisted v1/v2 JSON into the current, validated in-memory contract. */
export function migrateHandwritingDocument(value: unknown): HandwritingDocument {
  const source = record(value);
  const pages = (Array.isArray(source.pages) ? source.pages : []).map(normalizePage);
  const selectedPageId = string(source.selectedPageId);
  return {
    id: string(source.id),
    diaryId: string(source.diaryId),
    schemaVersion: HANDWRITING_SCHEMA_VERSION,
    selectedPageId: pages.some((page) => page.id === selectedPageId)
      ? selectedPageId
      : pages[0]?.id ?? selectedPageId,
    pages,
    createdAt: string(source.createdAt),
    updatedAt: string(source.updatedAt),
  };
}
