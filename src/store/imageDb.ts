import type { ImageMeta } from '../types';

const DB_NAME = 'zupu-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

export interface StoredImage {
  id: string;
  personId: string;
  blob: Blob;
  format: string;
  kind: 'avatar' | 'gallery';
  createdAt: number;
}

export interface ImageExportEntry {
  id: string;
  personId: string;
  blob: Blob;
  format: string;
  kind: 'avatar' | 'gallery';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_personId', 'personId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function saveImage(
  meta: ImageMeta,
  blob: Blob,
): Promise<void> {
  await tx('readwrite', (store) =>
    store.put({
      id: meta.id,
      personId: meta.personId,
      blob,
      format: meta.format,
      kind: meta.kind,
      createdAt: Date.now(),
    } as StoredImage),
  );
}

export async function getImage(
  id: string,
): Promise<{ blob: Blob; format: string } | null> {
  const result = await tx<StoredImage | undefined>('readonly', (store) =>
    store.get(id),
  );
  if (!result) return null;
  return { blob: result.blob, format: result.format };
}

export async function deleteImage(id: string): Promise<void> {
  await tx('readwrite', (store) => store.delete(id));
}

export async function deleteImagesForPerson(
  personId: string,
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('by_personId');
    const request = index.openCursor(IDBKeyRange.only(personId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllImagesForExport(): Promise<ImageExportEntry[]> {
  const db = await openDB();
  return new Promise<ImageExportEntry[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result as StoredImage[]).map((img) => ({
        id: img.id,
        personId: img.personId,
        blob: img.blob,
        format: img.format,
        kind: img.kind,
      }));
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function bulkImportImages(
  entries: ImageExportEntry[],
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    for (const entry of entries) {
      store.put({
        id: entry.id,
        personId: entry.personId,
        blob: entry.blob,
        format: entry.format,
        kind: entry.kind,
        createdAt: Date.now(),
      } as StoredImage);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearAllImages(): Promise<void> {
  await tx('readwrite', (store) => store.clear());
}
