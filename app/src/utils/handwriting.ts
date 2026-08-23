import {
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_PAGE_WIDTH,
  HANDWRITING_SCHEMA_VERSION,
  type HandwritingDocument,
  type HandwritingPage,
  type InkPoint,
  type InkStroke,
  type InkTool,
  type PageOrientation,
} from '../types/handwriting';

export function createHandwritingId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildInkStroke(
  points: InkPoint[],
  color: string,
  width: number,
  tool: InkTool = 'pen',
  opacity = tool === 'highlighter' ? 0.35 : 1,
): InkStroke {
  return {
    id: createHandwritingId('stroke'),
    points,
    tool,
    color,
    width,
    opacity,
  };
}

export function createHandwritingPage(
  orientation: PageOrientation = 'portrait',
): HandwritingPage {
  const landscape = orientation === 'landscape';
  return {
    id: createHandwritingId('page'),
    width: landscape ? DEFAULT_PAGE_HEIGHT : DEFAULT_PAGE_WIDTH,
    height: landscape ? DEFAULT_PAGE_WIDTH : DEFAULT_PAGE_HEIGHT,
    orientation,
    contentRevision: 0,
    thumbnailDirty: true,
    background: { type: 'preset', preset: 'blank' },
    layers: [
      {
        id: createHandwritingId('ink-layer'),
        type: 'ink',
        name: '필기',
        strokes: [],
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        hidden: false,
        locked: false,
      },
    ],
  };
}

export function createHandwritingDocument(diaryId: string): HandwritingDocument {
  const now = new Date().toISOString();
  const page = createHandwritingPage();
  return {
    id: createHandwritingId('handwriting'),
    diaryId,
    schemaVersion: HANDWRITING_SCHEMA_VERSION,
    selectedPageId: page.id,
    pages: [page],
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateHandwritingPage(page: HandwritingPage): HandwritingPage {
  const clone = JSON.parse(JSON.stringify(page)) as HandwritingPage;
  clone.id = createHandwritingId('page');
  clone.thumbnailUri = undefined;
  clone.thumbnailRevision = undefined;
  clone.thumbnailDirty = true;
  clone.layers = clone.layers.map((layer) => ({
    ...layer,
    id: createHandwritingId(`${layer.type}-layer`),
    ...(layer.type === 'ink'
      ? {
          strokes: layer.strokes.map((stroke) => ({
            ...stroke,
            id: createHandwritingId('stroke'),
          })),
        }
      : {}),
  }));
  return clone;
}
