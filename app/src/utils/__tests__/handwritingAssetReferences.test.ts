import { createHandwritingDocument } from '../handwriting';
import { addImageLayer, setPageBackground, setPageThumbnail } from '../handwritingDocument';
import { findUnreferencedHandwritingAssetUris } from '../handwritingAssetReferences';

describe('handwriting asset references', () => {
  it('keeps layer, background, and thumbnail files while selecting orphans for GC', () => {
    const initial = createHandwritingDocument('diary-1');
    const pageId = initial.selectedPageId;
    const withLayer = addImageLayer(initial, pageId, {
      originalUri: 'file:///layer-original.jpg',
      previewUri: 'file:///layer-preview.jpg',
      pixelWidth: 100,
      pixelHeight: 100,
    });
    const withBackground = setPageBackground(withLayer, pageId, {
      type: 'image',
      rotation: 0,
      asset: {
        originalUri: 'file:///background-original.jpg',
        previewUri: 'file:///background-preview.jpg',
        pixelWidth: 100,
        pixelHeight: 100,
      },
    });
    const document = setPageThumbnail(withBackground, pageId, 'file:///thumbnail.png');
    const managed = [
      'file:///layer-original.jpg', 'file:///layer-preview.jpg',
      'file:///background-original.jpg', 'file:///background-preview.jpg',
      'file:///thumbnail.png', 'file:///orphan-original.jpg', 'file:///orphan-preview.jpg',
    ];

    expect(findUnreferencedHandwritingAssetUris(document, managed)).toEqual([
      'file:///orphan-original.jpg',
      'file:///orphan-preview.jpg',
    ]);
  });
});
