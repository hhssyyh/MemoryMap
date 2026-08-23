import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { HandwritingDocument, ImageAssetReference } from '../types/handwriting';
import { collectReferencedHandwritingAssetUris } from '../utils/handwritingAssetReferences';

const MAX_PREVIEW_EDGE = 4096;

function createAssetId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function extensionFor(uri: string) {
  const extension = uri.split('?')[0]?.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1];
  return extension ? `.${extension.toLowerCase()}` : '.jpg';
}

function handwritingDirectory(diaryId: string, documentId: string, child: string) {
  return new Directory(
    Paths.document,
    'diaries',
    diaryId,
    'handwriting',
    documentId,
    child,
  );
}

/**
 * Imports an image transactionally. The untouched source is retained for future
 * high-resolution export and a normalized, bounded preview is used by the editor.
 */
export async function importHandwritingAsset(
  diaryId: string,
  documentId: string,
  sourceUri: string,
): Promise<ImageAssetReference> {
  const originals = handwritingDirectory(diaryId, documentId, 'originals');
  const previews = handwritingDirectory(diaryId, documentId, 'previews');
  originals.create({ idempotent: true, intermediates: true });
  previews.create({ idempotent: true, intermediates: true });

  const id = createAssetId();
  const original = new File(originals, `${id}${extensionFor(sourceUri)}`);
  const preview = new File(previews, `${id}.jpg`);
  let temporaryPreview: File | undefined;

  try {
    new File(sourceUri).copy(original);

    // Decoding and rendering normalizes the camera/EXIF orientation. Only resize
    // after that so portrait photos are bounded using their displayed dimensions.
    const normalized = await ImageManipulator.manipulate(original.uri).renderAsync();
    const longestEdge = Math.max(normalized.width, normalized.height);
    const rendered = longestEdge > MAX_PREVIEW_EDGE
      ? await ImageManipulator.manipulate(normalized)
        .resize(
          normalized.width >= normalized.height
            ? { width: MAX_PREVIEW_EDGE }
            : { height: MAX_PREVIEW_EDGE },
        )
        .renderAsync()
      : normalized;
    const result = await rendered.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
    temporaryPreview = new File(result.uri);
    temporaryPreview.copy(preview);

    return {
      originalUri: original.uri,
      previewUri: preview.uri,
      pixelWidth: result.width,
      pixelHeight: result.height,
    };
  } catch (error) {
    if (preview.exists) preview.delete();
    if (original.exists) original.delete();
    throw error;
  } finally {
    if (temporaryPreview?.exists) temporaryPreview.delete();
  }
}

export function writeHandwritingThumbnail(
  diaryId: string,
  documentId: string,
  pageId: string,
  pngBytes: Uint8Array,
) {
  const directory = handwritingDirectory(diaryId, documentId, 'thumbnails');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${pageId}.png`);
  file.create({ overwrite: true, intermediates: true });
  file.write(pngBytes);
  return file.uri;
}

/** Delete only managed files not referenced by the persisted document. */
export function cleanupHandwritingAssets(
  diaryId: string,
  documentId: string,
  document: HandwritingDocument,
) {
  const references = collectReferencedHandwritingAssetUris(document);
  ['assets', 'originals', 'previews', 'thumbnails'].forEach((child) => {
    const directory = handwritingDirectory(diaryId, documentId, child);
    if (!directory.exists) return;
    directory.list().forEach((entry) => {
      if (entry instanceof File && !references.has(entry.uri)) entry.delete();
    });
  });
}
