export const HANDWRITING_SCHEMA_VERSION = 1;

export const DEFAULT_PAGE_WIDTH = 900;
export const DEFAULT_PAGE_HEIGHT = 1200;

export type InkPoint = {
  // 기기 픽셀이 아닌 페이지 좌표를 사용해 화면 크기와 밀도가 달라도 같은 문서를 편집한다.
  x: number;
  y: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  azimuth?: number;
  timestamp: number;
};

export type InkTool = 'pen' | 'highlighter';

export type InkStroke = {
  id: string;
  points: InkPoint[];
  tool: InkTool;
  color: string;
  width: number;
  opacity: number;
};

export type PageBackground =
  | { type: 'preset'; preset: 'blank' | 'lined' | 'grid' | 'dot' | 'cream' }
  | { type: 'image'; assetUri: string };

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
  assetUri: string;
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
  background: PageBackground;
  layers: HandwritingLayer[];
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
