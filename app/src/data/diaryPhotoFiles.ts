import { Directory, File, Paths } from 'expo-file-system';

const diaryRoot = new Directory(Paths.document, 'diaries');

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function extensionFor(uri: string) {
  const extension = uri.split('?')[0]?.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1];
  return extension ? `.${extension.toLowerCase()}` : '.jpg';
}

export function isManagedDiaryPhoto(uri: string) {
  return uri.startsWith(diaryRoot.uri);
}

export function copyDiaryPhoto(diaryId: string, sourceUri: string) {
  const directory = new Directory(diaryRoot, diaryId, 'photos');
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, `${createId()}${extensionFor(sourceUri)}`);
  new File(sourceUri).copy(destination);
  return destination.uri;
}

export function deleteDiaryDirectory(diaryId: string) {
  const directory = new Directory(diaryRoot, diaryId);
  if (directory.exists) directory.delete();
}

export function deleteManagedPhoto(uri: string) {
  if (!isManagedDiaryPhoto(uri)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
