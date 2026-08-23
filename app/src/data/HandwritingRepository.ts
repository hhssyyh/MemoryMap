import { getDatabase } from './database';
import type {
  HandwritingDocument,
  HandwritingLayer,
  HandwritingPage,
  PageBackground,
} from '../types/handwriting';
import { HANDWRITING_SCHEMA_VERSION } from '../types/handwriting';
import { createHandwritingDocument } from '../utils/handwriting';
import { migrateHandwritingDocument } from '../utils/handwritingMigration';
import { assertHandwritingDocumentLimits } from '../utils/handwritingDocument';

type DocumentRow = {
  id: string;
  diary_id: string;
  schema_version: number;
  selected_page_id: string;
  created_at: string;
  updated_at: string;
};

type PageRow = {
  id: string;
  document_id: string;
  sort_order: number;
  width: number;
  height: number;
  background_json: string;
  layers_json: string;
  thumbnail_uri: string | null;
  content_revision: number;
  thumbnail_revision: number | null;
};

function parseJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`Invalid handwriting ${label} data.`);
  }
}

function toDocument(row: DocumentRow, pageRows: PageRow[]): HandwritingDocument {
  if (row.schema_version < 1 || row.schema_version > HANDWRITING_SCHEMA_VERSION) {
    throw new Error(`Unsupported handwriting schema version ${row.schema_version}.`);
  }

  const pages = pageRows
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((page) => ({
      id: page.id,
      width: page.width,
      height: page.height,
      background: parseJson<PageBackground | Record<string, unknown>>(page.background_json, 'background'),
      layers: parseJson<Array<HandwritingLayer | Record<string, unknown>>>(page.layers_json, 'layers'),
      contentRevision: page.content_revision,
      thumbnailRevision: page.thumbnail_revision ?? undefined,
      thumbnailDirty: page.thumbnail_revision !== page.content_revision,
      thumbnailUri: page.thumbnail_uri ?? undefined,
    }));

  return migrateHandwritingDocument({
    id: row.id,
    diaryId: row.diary_id,
    schemaVersion: row.schema_version,
    selectedPageId: pages.some((page) => page.id === row.selected_page_id)
      ? row.selected_page_id
      : pages[0]?.id ?? row.selected_page_id,
    pages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class HandwritingRepository {
  async load(diaryId: string): Promise<HandwritingDocument | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<DocumentRow>(
      'SELECT * FROM handwriting_documents WHERE diary_id = ?',
      diaryId,
    );
    if (!row) return null;
    const pages = await database.getAllAsync<PageRow>(
      'SELECT * FROM handwriting_pages WHERE document_id = ? ORDER BY sort_order',
      row.id,
    );
    return toDocument(row, pages);
  }

  async loadOrCreate(diaryId: string): Promise<HandwritingDocument> {
    return (await this.load(diaryId)) ?? createHandwritingDocument(diaryId);
  }

  async save(document: HandwritingDocument): Promise<HandwritingDocument> {
    if (document.pages.length === 0) {
      throw new Error('A handwriting document must contain at least one page.');
    }
    if (!document.pages.some((page) => page.id === document.selectedPageId)) {
      throw new Error('The selected handwriting page does not exist.');
    }
    assertHandwritingDocumentLimits(document);

    const database = await getDatabase();
    const updatedDocument = { ...document, updatedAt: new Date().toISOString() };
    await database.withTransactionAsync(async () => {
      await database.runAsync(
        `INSERT INTO handwriting_documents
          (id, diary_id, schema_version, selected_page_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          schema_version = excluded.schema_version,
          selected_page_id = excluded.selected_page_id,
          updated_at = excluded.updated_at`,
        updatedDocument.id,
        updatedDocument.diaryId,
        updatedDocument.schemaVersion,
        updatedDocument.selectedPageId,
        updatedDocument.createdAt,
        updatedDocument.updatedAt,
      );
      await database.runAsync(
        'DELETE FROM handwriting_pages WHERE document_id = ?',
        updatedDocument.id,
      );
      for (const [index, page] of updatedDocument.pages.entries()) {
        await database.runAsync(
          `INSERT INTO handwriting_pages
            (id, document_id, sort_order, width, height, background_json, layers_json, thumbnail_uri, content_revision, thumbnail_revision, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          page.id,
          updatedDocument.id,
          index,
          page.width,
          page.height,
          JSON.stringify(page.background),
          JSON.stringify(page.layers),
          page.thumbnailUri ?? null,
          page.contentRevision,
          page.thumbnailRevision ?? null,
          updatedDocument.updatedAt,
        );
      }
    });
    return updatedDocument;
  }
}

export const handwritingRepository = new HandwritingRepository();
