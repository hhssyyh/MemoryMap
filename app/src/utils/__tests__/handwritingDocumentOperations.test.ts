import {
  addPage,
  addImageLayer,
  addStickerLayer,
  deletePage,
  duplicatePage,
  movePage,
  selectPage,
} from '../handwritingDocument';
import { createHandwritingDocument } from '../handwriting';

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
    const withImage = addImageLayer(initial, pageId, 'file:///photo.jpg', 1200, 800);
    const withSticker = addStickerLayer(withImage, pageId, 'heart');
    const layers = withSticker.pages[0]!.layers;

    expect(layers.map((layer) => layer.type)).toEqual(['ink', 'image', 'sticker']);
    expect(layers[1]).toMatchObject({ assetUri: 'file:///photo.jpg' });
    expect(layers[1]?.type === 'image' ? layers[1].width : 0).toBeCloseTo(495);
    expect(layers[1]?.type === 'image' ? layers[1].height : 0).toBeCloseTo(330);
  });
});
