import type { HandwritingDocument } from '../types/handwriting';

export function collectReferencedHandwritingAssetUris(document: HandwritingDocument) {
  const references = new Set<string>();
  document.pages.forEach((page) => {
    if (page.thumbnailUri) references.add(page.thumbnailUri);
    if (page.background.type === 'image') {
      references.add(page.background.asset.originalUri);
      references.add(page.background.asset.previewUri);
    }
    page.layers.forEach((layer) => {
      if (layer.type === 'image') {
        references.add(layer.asset.originalUri);
        references.add(layer.asset.previewUri);
      }
    });
  });
  return references;
}

export function findUnreferencedHandwritingAssetUris(
  document: HandwritingDocument,
  managedUris: Iterable<string>,
) {
  const references = collectReferencedHandwritingAssetUris(document);
  return Array.from(managedUris).filter((uri) => !references.has(uri));
}
