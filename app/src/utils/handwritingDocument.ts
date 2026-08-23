import type {
  HandwritingDocument,
  HandwritingLayer,
  HandwritingPage,
  InkStroke,
  PageBackground,
} from '../types/handwriting';
import { createHandwritingPage, duplicateHandwritingPage } from './handwriting';
import { createHandwritingId } from './handwriting';

function replacePage(
  document: HandwritingDocument,
  pageId: string,
  update: (page: HandwritingPage) => HandwritingPage,
): HandwritingDocument {
  return {
    ...document,
    pages: document.pages.map((page) => (page.id === pageId ? update(page) : page)),
  };
}

export function addPage(document: HandwritingDocument): HandwritingDocument {
  const page = createHandwritingPage();
  const selectedIndex = document.pages.findIndex((item) => item.id === document.selectedPageId);
  const insertAt = selectedIndex < 0 ? document.pages.length : selectedIndex + 1;
  const pages = [...document.pages];
  pages.splice(insertAt, 0, page);
  return { ...document, pages, selectedPageId: page.id };
}

export function duplicatePage(document: HandwritingDocument, pageId: string): HandwritingDocument {
  const sourceIndex = document.pages.findIndex((page) => page.id === pageId);
  if (sourceIndex < 0) return document;
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
  return replacePage(document, pageId, (page) => ({
    ...page,
    layers: page.layers.map((layer) =>
      layer.type === 'ink' && layer.name === '필기' ? { ...layer, strokes } : layer,
    ),
  }));
}

export function setPageThumbnail(
  document: HandwritingDocument,
  pageId: string,
  thumbnailUri: string,
): HandwritingDocument {
  return replacePage(document, pageId, (page) => ({ ...page, thumbnailUri }));
}

export function getPageInkStrokes(page: HandwritingPage | undefined): InkStroke[] {
  const layer = page?.layers.find((item) => item.type === 'ink' && item.name === '필기');
  return layer?.type === 'ink' ? layer.strokes : [];
}

export function addImageLayer(
  document: HandwritingDocument,
  pageId: string,
  assetUri: string,
  sourceWidth: number,
  sourceHeight: number,
): HandwritingDocument {
  return replacePage(document, pageId, (page) => {
    const maxWidth = page.width * 0.55;
    const width = Math.min(maxWidth, sourceWidth || maxWidth);
    const height = sourceWidth > 0 ? width * (sourceHeight / sourceWidth) : width * 0.75;
    const layer: HandwritingLayer = {
      id: createHandwritingId('image-layer'),
      type: 'image',
      name: '이미지',
      assetUri,
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
): HandwritingDocument {
  return replacePage(document, pageId, (page) => {
    const size = page.width * 0.18;
    const layer: HandwritingLayer = {
      id: createHandwritingId('sticker-layer'),
      type: 'sticker',
      name: `스티커 · ${stickerId}`,
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
    const index = page.layers.findIndex((layer) => layer.id === layerId);
    const target = Math.max(0, Math.min(index + direction, page.layers.length - 1));
    if (index < 0 || index === target) return page;
    const layers = [...page.layers];
    const [layer] = layers.splice(index, 1);
    if (!layer) return page;
    layers.splice(target, 0, layer);
    return { ...page, layers };
  });
}
