import {
  createHandwritingDocument,
  duplicateHandwritingPage,
} from '../handwriting';
import { DEFAULT_PAGE_HEIGHT, DEFAULT_PAGE_WIDTH } from '../../types/handwriting';

describe('handwriting document', () => {
  it('starts with one selected 3:4 page and an ink layer', () => {
    const document = createHandwritingDocument('diary-1');

    expect(document.pages).toHaveLength(1);
    expect(document.selectedPageId).toBe(document.pages[0]?.id);
    expect(document.pages[0]).toMatchObject({
      width: DEFAULT_PAGE_WIDTH,
      height: DEFAULT_PAGE_HEIGHT,
      background: { type: 'preset', preset: 'blank' },
    });
    expect(document.pages[0]?.layers[0]?.type).toBe('ink');
  });

  it('duplicates page content with fresh page, layer, and stroke ids', () => {
    const page = createHandwritingDocument('diary-1').pages[0]!;
    const inkLayer = page.layers[0];
    if (inkLayer?.type !== 'ink') throw new Error('Expected an ink layer.');
    inkLayer.strokes.push({
      id: 'stroke-original',
      tool: 'pen',
      color: '#000000',
      width: 3,
      opacity: 1,
      points: [],
    });

    const duplicate = duplicateHandwritingPage(page);
    const duplicateInk = duplicate.layers[0];

    expect(duplicate.id).not.toBe(page.id);
    expect(duplicateInk?.id).not.toBe(inkLayer.id);
    expect(duplicateInk?.type === 'ink' ? duplicateInk.strokes[0]?.id : null).not.toBe(
      'stroke-original',
    );
  });
});
