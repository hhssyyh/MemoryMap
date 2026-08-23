export const HANDWRITING_SCHEMA_VERSION = 2;

export const DEFAULT_PAGE_WIDTH = 900;
export const DEFAULT_PAGE_HEIGHT = 1200;
export const MAX_HANDWRITING_PAGES = 10;
export const MAX_HANDWRITING_STROKES = 1000;

export type { InkPoint, InkStroke } from 'native-ink-view';
import type { InkStroke } from 'native-ink-view';
export type InkTool = InkStroke['tool'];

export type PageOrientation = 'portrait' | 'landscape';
export type QuarterTurn = 0 | 90 | 180 | 270;

export type ImageAssetReference = {
  originalUri: string;
  previewUri: string;
  pixelWidth: number;
  pixelHeight: number;
};

export type PageBackground =
  | { type: 'preset'; preset: 'blank' | 'lined' | 'grid' | 'dot' | 'cream' }
  | { type: 'image'; asset: ImageAssetReference; rotation: QuarterTurn };

export type LayerTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

type LayerBase = {
  id: string;
  name: string;
  transform: LayerTransform;
  hidden: boolean;
  locked: boolean;
};

export type InkLayer = LayerBase & {
  type: 'ink';
  strokes: InkStroke[];
};

export type ImageLayer = LayerBase & {
  type: 'image';
  asset: ImageAssetReference;
  width: number;
  height: number;
};

export type StickerLayer = LayerBase & {
  type: 'sticker';
  stickerId: string;
  width: number;
  height: number;
};

export type HandwritingLayer = InkLayer | ImageLayer | StickerLayer;

export type HandwritingPage = {
  id: string;
  width: number;
  height: number;
  orientation: PageOrientation;
  background: PageBackground;
  layers: HandwritingLayer[];
  contentRevision: number;
  thumbnailRevision?: number;
  thumbnailDirty: boolean;
  thumbnailUri?: string;
};

export type HandwritingDocument = {
  id: string;
  diaryId: string;
  schemaVersion: typeof HANDWRITING_SCHEMA_VERSION;
  selectedPageId: string;
  pages: HandwritingPage[];
  createdAt: string;
  updatedAt: string;
};
