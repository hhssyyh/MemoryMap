import { migrateHandwritingDocument } from '../handwritingMigration';

describe('handwriting schema migration', () => {
  it('migrates v1 image URIs and infers page orientation', () => {
    const migrated = migrateHandwritingDocument({
      id: 'document-1', diaryId: 'diary-1', schemaVersion: 1, selectedPageId: 'page-1',
      createdAt: 'created', updatedAt: 'updated',
      pages: [{
        id: 'page-1', width: 1200, height: 900,
        background: { type: 'image', assetUri: 'file:///background.jpg' },
        layers: [{
          id: 'ink-1', type: 'ink', name: '필기', strokes: [],
          transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }, hidden: false, locked: false,
        }, {
          id: 'image-1', type: 'image', name: '이미지', assetUri: 'file:///photo.jpg', width: 400, height: 300,
          transform: { x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0 }, hidden: false, locked: false,
        }],
      }],
    });

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.pages[0]).toMatchObject({
      orientation: 'landscape',
      background: {
        type: 'image', rotation: 0,
        asset: { originalUri: 'file:///background.jpg', previewUri: 'file:///background.jpg' },
      },
    });
    expect(migrated.pages[0]?.layers[1]).toMatchObject({
      asset: {
        originalUri: 'file:///photo.jpg', previewUri: 'file:///photo.jpg', pixelWidth: 400, pixelHeight: 300,
      },
    });
  });
});
