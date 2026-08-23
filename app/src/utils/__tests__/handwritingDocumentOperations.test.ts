import {
  addPage,
  addImageLayer,
  addStickerLayer,
  assertHandwritingDocumentLimits,
  canDuplicatePage,
  countDocumentInkStrokes,
  deletePage,
  duplicateLayer,
  duplicatePage,
  getTopmostEditableLayerAtPoint,
  movePage,
  moveLayer,
  moveLayerTo,
  rotatePage,
  selectPage,
  setPageInkStrokes,
  setPageThumbnail,
  updateLayer,
  constrainLayerTransform,
} from '../handwritingDocument';
import { createHandwritingDocument } from '../handwriting';
import { MAX_HANDWRITING_PAGES, MAX_HANDWRITING_STROKES } from '../../types/handwriting';

const photoAsset = {
  originalUri: 'file:///photo-original.jpg',
  previewUri: 'file:///photo-preview.jpg',
  pixelWidth: 1200,
  pixelHeight: 800,
};

describe('handwriting page operations', () => {
  it('adds and duplicates pages after the selected page', () => {
    const initial = createHandwritingDocument('diary-1');
    const added = addPage(initial);
    const duplicated = duplicatePage(added, added.selectedPageId);

    expect(added.pages).toHaveLength(2);
    expect(duplicated.pages).toHaveLength(3);
    expect(duplicated.selectedPageId).toBe(duplicated.pages[2]?.id);
  });

  it('does not delete the final page', () => {
    const document = createHandwritingDocument('diary-1');
    expect(deletePage(document, document.selectedPageId)).toBe(document);
  });

  it('selects the nearest remaining page after deleting the selection', () => {
    const initial = addPage(addPage(createHandwritingDocument('diary-1')));
    const middleId = initial.pages[1]!.id;
    const selected = selectPage(initial, middleId);
    const deleted = deletePage(selected, middleId);

    expect(deleted.pages).toHaveLength(2);
    expect(deleted.selectedPageId).toBe(deleted.pages[1]?.id);
  });

  it('reorders a page while retaining its selection', () => {
    const initial = addPage(addPage(createHandwritingDocument('diary-1')));
    const selectedId = initial.selectedPageId;
    const moved = movePage(initial, selectedId, 0);

    expect(moved.pages[0]?.id).toBe(selectedId);
    expect(moved.selectedPageId).toBe(selectedId);
  });

  it('adds editable image and sticker layers', () => {
    const initial = createHandwritingDocument('diary-1');
    const pageId = initial.selectedPageId;
    const withImage = addImageLayer(initial, pageId, photoAsset);
    const withSticker = addStickerLayer(withImage, pageId, 'heart');
    const layers = withSticker.pages[0]!.layers;

    expect(layers.map((layer) => layer.type)).toEqual(['ink', 'image', 'sticker']);
    expect(layers[1]).toMatchObject({ asset: photoAsset, name: '사진 1' });
    expect(layers[1]?.type === 'image' ? layers[1].width : 0).toBeCloseTo(495);
    expect(layers[1]?.type === 'image' ? layers[1].height : 0).toBeCloseTo(330);
  });

  it('rotates page content clockwise and restores it counterclockwise', () => {
    const initial = createHandwritingDocument('diary-1');
    const pageId = initial.selectedPageId;
    const withImage = addImageLayer(initial, pageId, photoAsset, 'image-1');
    const withInk = setPageInkStrokes(withImage, pageId, [{
      id: 'stroke-1', tool: 'pen', color: '#000000', width: 4, opacity: 1,
      points: [{ x: 100, y: 200, tiltX: 1, tiltY: 2, azimuth: 0, timestamp: 1 }],
    }]);
    const withThumbnail = setPageThumbnail(withInk, pageId, 'file:///old-thumbnail.png');
    const clockwise = rotatePage(withThumbnail, pageId, 'clockwise');
    const restored = rotatePage(clockwise, pageId, 'counterclockwise');

    expect(clockwise.pages[0]).toMatchObject({ width: 1200, height: 900, orientation: 'landscape' });
    expect(clockwise.pages[0]?.layers[0]).toMatchObject({
      strokes: [{ points: [{ x: 1000, y: 100, tiltX: -2, tiltY: 1, azimuth: Math.PI / 2 }] }],
    });
    expect(clockwise.pages[0]?.layers[1]).toMatchObject({
      transform: { x: 352.5, y: 285, rotation: 90 },
    });
    expect(clockwise.pages[0]).toMatchObject({ thumbnailDirty: true });
    expect(clockwise.pages[0]?.thumbnailUri).toBeUndefined();
    expect(clockwise.pages[0]?.thumbnailRevision).toBeUndefined();
    expect(restored.pages[0]).toMatchObject({ width: 900, height: 1200, orientation: 'portrait' });
    expect(restored.pages[0]?.layers[0]).toMatchObject({
      strokes: [{ points: [{ x: 100, y: 200, tiltX: 1, tiltY: 2, azimuth: 0 }] }],
    });
    const restoredImage = restored.pages[0]?.layers[1];
    expect(restoredImage?.transform.x).toBeCloseTo(202.5, 8);
    expect(restoredImage?.transform.y).toBeCloseTo(435, 8);
    expect(restoredImage?.transform.rotation).toBe(0);
  });

  it('selects the topmost visible unlocked layer and duplicates it', () => {
    const initial = createHandwritingDocument('diary-1');
    const pageId = initial.selectedPageId;
    const first = addImageLayer(initial, pageId, photoAsset, 'first');
    const second = addStickerLayer(first, pageId, 'heart', 'second');
    const page = second.pages[0]!;
    const topmost = getTopmostEditableLayerAtPoint(page, { x: 450, y: 600 });
    const duplicated = duplicateLayer(second, pageId, topmost!.id, 'duplicate');

    expect(topmost?.id).toBe('second');
    expect(duplicated.pages[0]?.layers.at(-1)).toMatchObject({ id: 'duplicate', name: '스티커 2' });
  });

  it('ignores hidden and locked layers during hit testing and preserves panel ordering', () => {
    const initial = createHandwritingDocument('diary-1');
    const pageId = initial.selectedPageId;
    const withLayers = addStickerLayer(
      addImageLayer(initial, pageId, photoAsset, 'photo'),
      pageId,
      'heart',
      'sticker',
    );
    const locked = updateLayer(withLayers, pageId, 'sticker', (layer) => ({ ...layer, locked: true }));
    expect(getTopmostEditableLayerAtPoint(locked.pages[0]!, { x: 450, y: 600 })?.id).toBe('photo');
    const hidden = updateLayer(locked, pageId, 'photo', (layer) => ({ ...layer, hidden: true }));
    expect(getTopmostEditableLayerAtPoint(hidden.pages[0]!, { x: 450, y: 600 })).toBeUndefined();

    const forward = moveLayer(withLayers, pageId, 'photo', 1);
    expect(forward.pages[0]?.layers.at(-1)?.id).toBe('photo');
    const back = moveLayerTo(forward, pageId, 'photo', 'back');
    expect(back.pages[0]?.layers[1]?.id).toBe('photo');
    expect(back.pages[0]?.layers[0]?.type).toBe('ink');
    const front = moveLayerTo(back, pageId, 'photo', 'front');
    expect(front.pages[0]?.layers.at(-1)?.id).toBe('photo');

    const stillAboveInk = moveLayer(back, pageId, 'photo', -1);
    expect(stillAboveInk).toBe(back);
  });

  it('fits tall images and rotated transforms inside page bounds', () => {
    const initial = createHandwritingDocument('diary-1');
    const pageId = initial.selectedPageId;
    const tall = addImageLayer(initial, pageId, {
      ...photoAsset,
      pixelWidth: 600,
      pixelHeight: 2400,
    }, 'tall');
    const layer = tall.pages[0]!.layers[1];
    if (!layer || layer.type === 'ink') throw new Error('Expected image layer.');
    expect(layer.height).toBeLessThanOrEqual(tall.pages[0]!.height * 0.55);

    const constrained = constrainLayerTransform(tall.pages[0]!, layer, {
      x: -500,
      y: 2000,
      scaleX: 6,
      scaleY: 6,
      rotation: 45,
    });
    const radians = Math.PI / 4;
    const boundsWidth = layer.width * constrained.scaleX * Math.abs(Math.cos(radians)) +
      layer.height * constrained.scaleY * Math.abs(Math.sin(radians));
    const boundsHeight = layer.width * constrained.scaleX * Math.abs(Math.sin(radians)) +
      layer.height * constrained.scaleY * Math.abs(Math.cos(radians));
    const centerX = constrained.x + layer.width * constrained.scaleX / 2;
    const centerY = constrained.y + layer.height * constrained.scaleY / 2;
    expect(centerX - boundsWidth / 2).toBeGreaterThanOrEqual(-0.001);
    expect(centerX + boundsWidth / 2).toBeLessThanOrEqual(tall.pages[0]!.width + 0.001);
    expect(centerY - boundsHeight / 2).toBeGreaterThanOrEqual(-0.001);
    expect(centerY + boundsHeight / 2).toBeLessThanOrEqual(tall.pages[0]!.height + 0.001);
  });

  it('enforces page and document stroke limits without blocking erasing', () => {
    let document = createHandwritingDocument('diary-1');
    for (let index = 1; index < MAX_HANDWRITING_PAGES + 2; index += 1) document = addPage(document);
    expect(document.pages).toHaveLength(MAX_HANDWRITING_PAGES);

    const pageId = document.selectedPageId;
    const strokes = Array.from({ length: MAX_HANDWRITING_STROKES }, (_, index) => ({
      id: `stroke-${index}`, tool: 'pen' as const, color: '#000', width: 1, opacity: 1,
      points: [{ x: index, y: index, timestamp: index }],
    }));
    const full = setPageInkStrokes(document, pageId, strokes);
    const rejected = setPageInkStrokes(full, pageId, [...strokes, { ...strokes[0]!, id: 'overflow' }]);
    const erased = setPageInkStrokes(rejected, pageId, strokes.slice(0, -1));

    expect(countDocumentInkStrokes(full)).toBe(MAX_HANDWRITING_STROKES);
    expect(rejected).toBe(full);
    expect(countDocumentInkStrokes(erased)).toBe(MAX_HANDWRITING_STROKES - 1);
  });

  it('does not allow page duplication to exceed the document stroke limit', () => {
    const initial = createHandwritingDocument('diary-1');
    const pageId = initial.selectedPageId;
    const strokes = Array.from({ length: 600 }, (_, index) => ({
      id: `stroke-${index}`, tool: 'pen' as const, color: '#000', width: 1, opacity: 1,
      points: [{ x: index, y: index, timestamp: index }],
    }));
    const document = setPageInkStrokes(initial, pageId, strokes);

    expect(canDuplicatePage(document, pageId)).toBe(false);
    expect(duplicatePage(document, pageId)).toBe(document);
  });

  it('rejects over-limit documents at the persistence boundary', () => {
    const initial = createHandwritingDocument('diary-1');
    const ink = initial.pages[0]!.layers[0];
    if (!ink || ink.type !== 'ink') throw new Error('Expected ink layer.');
    const invalid = {
      ...initial,
      pages: [{
        ...initial.pages[0]!,
        layers: [{
          ...ink,
          strokes: Array.from({ length: MAX_HANDWRITING_STROKES + 1 }, (_, index) => ({
            id: `stroke-${index}`, tool: 'pen' as const, color: '#000', width: 1, opacity: 1,
            points: [{ x: index, y: index, timestamp: index }],
          })),
        }],
      }],
    };

    expect(() => assertHandwritingDocumentLimits(invalid)).toThrow('at most 1000 strokes');
  });

  it('tracks page content and thumbnail revisions independently', () => {
    const initial = createHandwritingDocument('diary-1');
    const pageId = initial.selectedPageId;
    const changed = addStickerLayer(initial, pageId, 'heart');
    expect(changed.pages[0]).toMatchObject({ contentRevision: 1, thumbnailDirty: true });

    const thumbnailed = setPageThumbnail(changed, pageId, 'file:///thumbnail.png');
    expect(thumbnailed.pages[0]).toMatchObject({
      contentRevision: 1,
      thumbnailRevision: 1,
      thumbnailDirty: false,
    });
    const changedAgain = setPageInkStrokes(thumbnailed, pageId, [{
      id: 'stroke', tool: 'pen', color: '#000', width: 1, opacity: 1,
      points: [{ x: 1, y: 1, timestamp: 1 }],
    }]);
    expect(changedAgain.pages[0]).toMatchObject({
      contentRevision: 2,
      thumbnailRevision: 1,
      thumbnailDirty: true,
    });
  });
});
