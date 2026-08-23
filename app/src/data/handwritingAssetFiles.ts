import { Directory, File, Paths } from 'expo-file-system';

function createAssetId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function extensionFor(uri: string) {
  const extension = uri.split('?')[0]?.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1];
  return extension ? `.${extension.toLowerCase()}` : '.jpg';
}

export function copyHandwritingAsset(
  diaryId: string,
  documentId: string,
  sourceUri: string,
) {
  const directory = new Directory(
    Paths.document,
    'diaries',
    diaryId,
    'handwriting',
    documentId,
    'assets',
  );
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, `${createAssetId()}${extensionFor(sourceUri)}`);
  new File(sourceUri).copy(destination);
  return destination.uri;
}

export function writeHandwritingThumbnail(
  diaryId: string,
  documentId: string,
  pageId: string,
  pngBytes: Uint8Array,
) {
  const directory = new Directory(
    Paths.document,
    'diaries',
    diaryId,
    'handwriting',
    documentId,
    'thumbnails',
  );
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${pageId}.png`);
  file.create({ overwrite: true, intermediates: true });
  file.write(pngBytes);
  return file.uri;
}
