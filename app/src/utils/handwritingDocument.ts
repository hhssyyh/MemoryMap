import type {
  HandwritingDocument,
  HandwritingLayer,
  HandwritingPage,
  ImageAssetReference,
  InkStroke,
  LayerTransform,
  PageBackground,
} from '../types/handwriting';
import {
  MAX_HANDWRITING_PAGES,
  MAX_HANDWRITING_POINTS,
  MAX_HANDWRITING_POINTS_PER_STROKE,
  MAX_HANDWRITING_STROKES,
  MAX_HANDWRITING_EDITABLE_LAYERS,
  MAX_HANDWRITING_EDITABLE_LAYERS_PER_PAGE,
} from '../types/handwriting';
import { createHandwritingPage, duplicateHandwritingPage } from './handwriting';
import { createHandwritingId } from './handwriting';
import { translateSelectedInkStrokes } from './handwritingInkSelection';

function replacePage(
  document: HandwritingDocument,
  pageId: string,
  update: (page: HandwritingPage) => HandwritingPage,
  contentChange = true,
): HandwritingDocument {
  let changed = false;
  const pages = document.pages.map((page) => {
    if (page.id !== pageId) return page;
    const next = update(page);
    if (next === page) return page;
    changed = true;
    if (!contentChange) return next;
    return {
      ...next,
      contentRevision: page.contentRevision + 1,
      thumbnailDirty: true,
    };
  });
  return changed ? { ...document, pages } : document;
}

export function addPage(document: HandwritingDocument): HandwritingDocument {
  if (document.pages.length >= MAX_HANDWRITING_PAGES) return document;
  const selected = document.pages.find((page) => page.id === document.selectedPageId);
  const page = createHandwritingPage(selected?.orientation ?? 'portrait');
  const selectedIndex = document.pages.findIndex((item) => item.id === document.selectedPageId);
  const insertAt = selectedIndex < 0 ? document.pages.length : selectedIndex + 1;
  const pages = [...document.pages];
  pages.splice(insertAt, 0, page);
  return { ...document, pages, selectedPageId: page.id };
}

export function duplicatePage(document: HandwritingDocument, pageId: string): HandwritingDocument {
  if (!canDuplicatePage(document, pageId)) return document;
  const sourceIndex = document.pages.findIndex((page) => page.id === pageId);
  const page = duplicateHandwritingPage(document.pages[sourceIndex]!);
  const pages = [...document.pages];
  pages.splice(sourceIndex + 1, 0, page);
  return { ...document, pages, selectedPageId: page.id };
}

export function deletePage(document: HandwritingDocument, pageId: string): HandwritingDocument {
  if (document.pages.length === 1) return document;
  const deletedIndex = document.pages.findIndex((page) => page.id === pageId);
  if (deletedIndex < 0) return document;
  const pages = document.pages.filter((page) => page.id !== pageId);
  const nextSelected = pages[Math.min(deletedIndex, pages.length - 1)]!;
  return {
    ...document,
    pages,
    selectedPageId:
      document.selectedPageId === pageId ? nextSelected.id : document.selectedPageId,
  };
}

export function movePage(
  document: HandwritingDocument,
  pageId: string,
  targetIndex: number,
): HandwritingDocument {
  const sourceIndex = document.pages.findIndex((page) => page.id === pageId);
  const boundedTarget = Math.max(0, Math.min(targetIndex, document.pages.length - 1));
  if (sourceIndex < 0 || sourceIndex === boundedTarget) return document;
  const pages = [...document.pages];
  const [page] = pages.splice(sourceIndex, 1);
  if (!page) return document;
  pages.splice(boundedTarget, 0, page);
  return { ...document, pages };
}

export function selectPage(document: HandwritingDocument, pageId: string): HandwritingDocument {
  if (document.selectedPageId === pageId) return document;
  if (!document.pages.some((page) => page.id === pageId)) return document;
  return { ...document, selectedPageId: pageId };
}

export function setPageBackground(
  document: HandwritingDocument,
  pageId: string,
  background: PageBackground,
): HandwritingDocument {
  return replacePage(document, pageId, (page) => ({ ...page, background }));
}

export function setPageInkStrokes(
  document: HandwritingDocument,
  pageId: string,
  strokes: InkStroke[],
): HandwritingDocument {
  const currentPage = document.pages.find((page) => page.id === pageId);
  const currentPageCount = getPageInkStrokes(currentPage).length;
  const currentTotal = countDocumentInkStrokes(document);
  const nextTotal = currentTotal - currentPageCount + strokes.length;
  if (nextTotal > MAX_HANDWRITING_STROKES && nextTotal > currentTotal) return document;
  const currentPoints = countDocumentInkPoints(document);
  const currentPagePoints = countInkPoints(getPageInkStrokes(currentPage));
  const nextPoints = currentPoints - currentPagePoints + countInkPoints(strokes);
  if (nextPoints > MAX_HANDWRITING_POINTS && nextPoints >= currentPoints) return document;
  const currentPointCountById = new Map(
    getPageInkStrokes(currentPage).map((stroke) => [stroke.id, stroke.points.length]),
  );
  if (strokes.some((stroke) =>
    stroke.points.length > MAX_HANDWRITING_POINTS_PER_STROKE &&
    stroke.points.length > (currentPointCountById.get(stroke.id) ?? 0))) return document;
  return replacePage(document, pageId, (page) => ({
    ...page,
    layers: page.layers.map((layer) =>
      layer.type === 'ink' && layer.name === '필기' ? { ...layer, strokes } : layer,
    ),
  }));
}

export function translatePageInkStrokes(
  document: HandwritingDocument,
  pageId: string,
  selectedIds: ReadonlySet<string>,
  delta: { x: number; y: number },
): HandwritingDocument {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) return document;
  const strokes = getPageInkStrokes(page);
  const translated = translateSelectedInkStrokes(strokes, selectedIds, delta, page);
  return translated === strokes ? document : setPageInkStrokes(document, pageId, translated);
}

export function setPageThumbnail(
  document: HandwritingDocument,
  pageId: string,
  thumbnailUri: string,
): HandwritingDocument {
  return replacePage(document, pageId, (page) => ({
    ...page,
    thumbnailUri,
    thumbnailRevision: page.contentRevision,
    thumbnailDirty: false,
  }), false);
}

export function getPageInkStrokes(page: HandwritingPage | undefined): InkStroke[] {
  const layer = page?.layers.find((item) => item.type === 'ink' && item.name === '필기');
  return layer?.type === 'ink' ? layer.strokes : [];
}

export function countDocumentInkStrokes(document: HandwritingDocument): number {
  return document.pages.reduce((total, page) => total + getPageInkStrokes(page).length, 0);
}

export function countInkPoints(strokes: InkStroke[]): number {
  return strokes.reduce((total, stroke) => total + stroke.points.length, 0);
}

export function countDocumentInkPoints(document: HandwritingDocument): number {
  return document.pages.reduce(
    (total, page) => total + countInkPoints(getPageInkStrokes(page)),
    0,
  );
}

function countEditableLayers(page: HandwritingPage): number {
  return page.layers.filter((layer) => layer.type !== 'ink').length;
}

function countDocumentEditableLayers(document: HandwritingDocument): number {
  return document.pages.reduce((total, page) => total + countEditableLayers(page), 0);
}

export function canAddEditableLayer(document: HandwritingDocument, pageId: string): boolean {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) return false;
  return countEditableLayers(page) < MAX_HANDWRITING_EDITABLE_LAYERS_PER_PAGE &&
    countDocumentEditableLayers(document) < MAX_HANDWRITING_EDITABLE_LAYERS;
}

export function canDuplicatePage(document: HandwritingDocument, pageId: string): boolean {
  if (document.pages.length >= MAX_HANDWRITING_PAGES) return false;
  const source = document.pages.find((page) => page.id === pageId);
  if (!source) return false;
  return countDocumentInkStrokes(document) + getPageInkStrokes(source).length <= MAX_HANDWRITING_STROKES &&
    countDocumentInkPoints(document) + countInkPoints(getPageInkStrokes(source)) <= MAX_HANDWRITING_POINTS &&
    countDocumentEditableLayers(document) + countEditableLayers(source) <= MAX_HANDWRITING_EDITABLE_LAYERS;
}

/** Persistence boundary guard for limits that every document mutation must preserve. */
export function assertHandwritingDocumentLimits(document: HandwritingDocument): void {
  if (document.pages.length > MAX_HANDWRITING_PAGES) {
    throw new Error(`A handwriting document may contain at most ${MAX_HANDWRITING_PAGES} pages.`);
  }
  if (countDocumentInkStrokes(document) > MAX_HANDWRITING_STROKES) {
    throw new Error(`A handwriting document may contain at most ${MAX_HANDWRITING_STROKES} strokes.`);
  }
  if (countDocumentInkPoints(document) > MAX_HANDWRITING_POINTS) {
    throw new Error(`A handwriting document may contain at most ${MAX_HANDWRITING_POINTS} ink points.`);
  }
  if (document.pages.some((page) =>
    getPageInkStrokes(page).some((stroke) => stroke.points.length > MAX_HANDWRITING_POINTS_PER_STROKE))) {
    throw new Error(`A handwriting stroke may contain at most ${MAX_HANDWRITING_POINTS_PER_STROKE} points.`);
  }
  if (document.pages.some((page) => countEditableLayers(page) > MAX_HANDWRITING_EDITABLE_LAYERS_PER_PAGE)) {
    throw new Error(`A handwriting page may contain at most ${MAX_HANDWRITING_EDITABLE_LAYERS_PER_PAGE} editable layers.`);
  }
  if (countDocumentEditableLayers(document) > MAX_HANDWRITING_EDITABLE_LAYERS) {
    throw new Error(`A handwriting document may contain at most ${MAX_HANDWRITING_EDITABLE_LAYERS} editable layers.`);
  }
}

export function addImageLayer(
  document: HandwritingDocument,
  pageId: string,
  asset: ImageAssetReference,
  layerId = createHandwritingId('image-layer'),
): HandwritingDocument {
  if (!canAddEditableLayer(document, pageId)) return document;
  return replacePage(document, pageId, (page) => {
    const sourceWidth = asset.pixelWidth;
    const sourceHeight = asset.pixelHeight;
    const maxWidth = page.width * 0.55;
    const maxHeight = page.height * 0.55;
    const aspectRatio = sourceWidth > 0 && sourceHeight > 0 ? sourceHeight / sourceWidth : 0.75;
    const width = Math.min(maxWidth, maxHeight / aspectRatio, sourceWidth || maxWidth);
    const height = width * aspectRatio;
    const layer: HandwritingLayer = {
      id: layerId,
      type: 'image',
      name: nextLayerName(page, '사진'),
      asset,
      width,
      height,
      transform: {
        x: (page.width - width) / 2,
        y: (page.height - height) / 2,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      hidden: false,
      locked: false,
    };
    return { ...page, layers: [...page.layers, layer] };
  });
}

export function addStickerLayer(
  document: HandwritingDocument,
  pageId: string,
  stickerId: string,
  layerId = createHandwritingId('sticker-layer'),
): HandwritingDocument {
  if (!canAddEditableLayer(document, pageId)) return document;
  return replacePage(document, pageId, (page) => {
    const size = page.width * 0.18;
    const layer: HandwritingLayer = {
      id: layerId,
      type: 'sticker',
      name: nextLayerName(page, '스티커'),
      stickerId,
      width: size,
      height: size,
      transform: {
        x: (page.width - size) / 2,
        y: (page.height - size) / 2,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      hidden: false,
      locked: false,
    };
    return { ...page, layers: [...page.layers, layer] };
  });
}

export function updateLayer(
  document: HandwritingDocument,
  pageId: string,
  layerId: string,
  update: (layer: HandwritingLayer) => HandwritingLayer,
): HandwritingDocument {
  return replacePage(document, pageId, (page) => ({
    ...page,
    layers: page.layers.map((layer) => (layer.id === layerId ? update(layer) : layer)),
  }));
}

export function deleteLayer(
  document: HandwritingDocument,
  pageId: string,
  layerId: string,
): HandwritingDocument {
  return replacePage(document, pageId, (page) => ({
    ...page,
    layers: page.layers.filter((layer) => layer.id !== layerId || layer.type === 'ink'),
  }));
}

export function moveLayer(
  document: HandwritingDocument,
  pageId: string,
  layerId: string,
  direction: -1 | 1,
): HandwritingDocument {
  return replacePage(document, pageId, (page) => {
    const inkLayers = page.layers.filter((layer) => layer.type === 'ink');
    const editableLayers = page.layers.filter((layer) => layer.type !== 'ink');
    const index = editableLayers.findIndex((layer) => layer.id === layerId);
    const target = Math.max(0, Math.min(index + direction, editableLayers.length - 1));
    if (index < 0 || index === target) return page;
    const [layer] = editableLayers.splice(index, 1);
    if (!layer) return page;
    editableLayers.splice(target, 0, layer);
    return { ...page, layers: [...inkLayers, ...editableLayers] };
  });
}

function nextLayerName(page: HandwritingPage, prefix: '사진' | '스티커') {
  const used = new Set(page.layers.map((layer) => layer.name));
  let index = 1;
  while (used.has(`${prefix} ${index}`)) index += 1;
  return `${prefix} ${index}`;
}

export function duplicateLayer(
  document: HandwritingDocument,
  pageId: string,
  layerId: string,
  duplicateId = createHandwritingId('layer'),
): HandwritingDocument {
  if (!canAddEditableLayer(document, pageId)) return document;
  return replacePage(document, pageId, (page) => {
    const index = page.layers.findIndex((layer) => layer.id === layerId && layer.type !== 'ink');
    if (index < 0) return page;
    const source = page.layers[index]!;
    if (source.type === 'ink') return page;
    const prefix = source.type === 'image' ? '사진' : '스티커';
    const duplicate: HandwritingLayer = {
      ...source,
      id: duplicateId,
      name: nextLayerName(page, prefix),
      transform: constrainLayerTransform(page, source, {
        ...source.transform,
        x: source.transform.x + 24,
        y: source.transform.y + 24,
      }),
    };
    const layers = [...page.layers];
    layers.splice(index + 1, 0, duplicate);
    return { ...page, layers };
  });
}

export function moveLayerTo(
  document: HandwritingDocument,
  pageId: string,
  layerId: string,
  destination: 'front' | 'back',
): HandwritingDocument {
  return replacePage(document, pageId, (page) => {
    const inkLayers = page.layers.filter((layer) => layer.type === 'ink');
    const editableLayers = page.layers.filter((layer) => layer.type !== 'ink');
    const index = editableLayers.findIndex((layer) => layer.id === layerId);
    if (index < 0) return page;
    const [layer] = editableLayers.splice(index, 1);
    if (!layer) return page;
    if (destination === 'front') editableLayers.push(layer);
    else editableLayers.unshift(layer);
    return { ...page, layers: [...inkLayers, ...editableLayers] };
  });
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function rotateAzimuth(value: number | undefined, degrees: number) {
  if (value === undefined) return undefined;
  const fullTurn = Math.PI * 2;
  return ((value + (degrees * Math.PI) / 180) % fullTurn + fullTurn) % fullTurn;
}

export function rotatePage(
  document: HandwritingDocument,
  pageId: string,
  direction: 'clockwise' | 'counterclockwise',
): HandwritingDocument {
  return replacePage(document, pageId, (page) => {
    const clockwise = direction === 'clockwise';
    const rotatePoint = (x: number, y: number) =>
      clockwise ? { x: page.height - y, y: x } : { x: y, y: page.width - x };
    const layers = page.layers.map((layer): HandwritingLayer => {
      if (layer.type === 'ink') {
        return {
          ...layer,
          strokes: layer.strokes.map((stroke) => ({
            ...stroke,
            points: stroke.points.map((point) => {
              const rotated = rotatePoint(point.x, point.y);
              return {
                ...point,
                ...rotated,
                tiltX: clockwise ? point.tiltY === undefined ? undefined : -point.tiltY : point.tiltY,
                tiltY: clockwise ? point.tiltX : point.tiltX === undefined ? undefined : -point.tiltX,
                azimuth: rotateAzimuth(point.azimuth, clockwise ? 90 : -90),
              };
            }),
          })),
        };
      }
      const scaledWidth = layer.width * layer.transform.scaleX;
      const scaledHeight = layer.height * layer.transform.scaleY;
      const center = rotatePoint(
        layer.transform.x + scaledWidth / 2,
        layer.transform.y + scaledHeight / 2,
      );
      return {
        ...layer,
        transform: {
          ...layer.transform,
          x: center.x - scaledWidth / 2,
          y: center.y - scaledHeight / 2,
          rotation: normalizeDegrees(layer.transform.rotation + (clockwise ? 90 : -90)),
        },
      };
    });
    const background = page.background.type === 'image'
      ? {
          ...page.background,
          rotation: normalizeDegrees(
            page.background.rotation + (clockwise ? 90 : -90),
          ) as 0 | 90 | 180 | 270,
        }
      : page.background;
    return {
      ...page,
      width: page.height,
      height: page.width,
      orientation: page.orientation === 'portrait' ? 'landscape' : 'portrait',
      background,
      layers,
      thumbnailUri: undefined,
      thumbnailRevision: undefined,
    };
  });
}

export function getTopmostEditableLayerAtPoint(
  page: HandwritingPage,
  point: { x: number; y: number },
): Exclude<HandwritingLayer, { type: 'ink' }> | undefined {
  for (let index = page.layers.length - 1; index >= 0; index -= 1) {
    const layer = page.layers[index];
    if (!layer || layer.type === 'ink' || layer.hidden || layer.locked) continue;
    const width = layer.width * layer.transform.scaleX;
    const height = layer.height * layer.transform.scaleY;
    const centerX = layer.transform.x + width / 2;
    const centerY = layer.transform.y + height / 2;
    const radians = (-layer.transform.rotation * Math.PI) / 180;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const localX = dx * Math.cos(radians) - dy * Math.sin(radians);
    const localY = dx * Math.sin(radians) + dy * Math.cos(radians);
    if (Math.abs(localX) <= width / 2 && Math.abs(localY) <= height / 2) return layer;
  }
  return undefined;
}

export function constrainLayerTransform(
  page: HandwritingPage,
  layer: Exclude<HandwritingLayer, { type: 'ink' }>,
  candidate: LayerTransform,
): LayerTransform {
  const radians = (candidate.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const rawWidth = layer.width * Math.max(0.1, Math.min(6, candidate.scaleX));
  const rawHeight = layer.height * Math.max(0.1, Math.min(6, candidate.scaleY));
  const boundsWidth = rawWidth * cos + rawHeight * sin;
  const boundsHeight = rawWidth * sin + rawHeight * cos;
  const fit = Math.min(1, page.width / Math.max(1, boundsWidth), page.height / Math.max(1, boundsHeight));
  const scaleX = (rawWidth * fit) / layer.width;
  const scaleY = (rawHeight * fit) / layer.height;
  const width = layer.width * scaleX;
  const height = layer.height * scaleY;
  const fittedBoundsWidth = width * cos + height * sin;
  const fittedBoundsHeight = width * sin + height * cos;
  const desiredCenterX = candidate.x + rawWidth / 2;
  const desiredCenterY = candidate.y + rawHeight / 2;
  const centerX = Math.max(fittedBoundsWidth / 2, Math.min(page.width - fittedBoundsWidth / 2, desiredCenterX));
  const centerY = Math.max(fittedBoundsHeight / 2, Math.min(page.height - fittedBoundsHeight / 2, desiredCenterY));
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    scaleX,
    scaleY,
    rotation: normalizeDegrees(candidate.rotation),
  };
}
