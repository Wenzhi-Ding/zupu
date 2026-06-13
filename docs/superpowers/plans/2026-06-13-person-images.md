# Person Images (Avatar + Gallery) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-person image support: a 1:1 cropped avatar shown on tree cards and sidebar, plus a gallery of up to 9 images browsable in a modal, with zip-based export/import.

**Architecture:** Image blobs stored in IndexedDB (`zupu-images` DB); only metadata IDs in localStorage Person objects. Avatar rendered as SVG `<image>` with clipPath on tree cards. Gallery and crop are HTML overlay modals. Export packages `data.json` + `images/` folder via JSZip; import auto-detects `.json` vs `.zip`.

**Tech Stack:** React 19, Zustand 5, TypeScript 5.9, Vite 7, Vitest, react-easy-crop, jszip, fake-indexeddb (test)

**Spec:** `docs/superpowers/specs/2026-06-13-person-images-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/utils/imageCompression.ts` | Resize/compress images >2MB to max 1200px JPEG |
| `src/utils/imageCompression.test.ts` | Unit tests for compression |
| `src/store/imageDb.ts` | IndexedDB CRUD for image blobs |
| `src/store/imageDb.test.ts` | Unit tests for imageDb (fake-indexeddb) |
| `src/hooks/useImageUrl.ts` | React hooks: `useImageUrl`, `useAvatarUrl` |
| `src/hooks/useImageUrl.test.ts` | Hook tests |
| `src/components/CropModal.tsx` | 1:1 avatar crop modal (react-easy-crop) |
| `src/components/CropModal.css` | Crop modal styles |
| `src/components/GalleryModal.tsx` | Gallery view/edit/reorder/upload modal |
| `src/components/GalleryModal.css` | Gallery modal styles |

### Modified files
| File | Changes |
|------|---------|
| `package.json` | Add react-easy-crop, jszip, fake-indexeddb |
| `vite.config.ts` | Add hooks + components to coverage include |
| `src/types/index.ts` | Add `avatarImageId`, `galleryImageIds` to Person; add `ImageMeta` |
| `src/i18n/zh.ts` | New translation keys |
| `src/i18n/en.ts` | New translation keys |
| `src/store/localDb.ts` | Validate new Person fields; add images to import/export |
| `src/store/localDb.test.ts` | Tests for new validation |
| `src/store/familyStore.ts` | Delete images on person delete; extend updatePerson |
| `src/components/PersonCard.tsx` | Render avatar SVG circle |
| `src/components/PersonCard.css` | Avatar circle styles |
| `src/components/Sidebar.tsx` | Avatar display + gallery/crop entry buttons |
| `src/components/Sidebar.css` | Avatar + button styles |
| `src/store/useDataIO.ts` | Zip export, dual-format import |
| `src/components/DataManager.tsx` | File accept `.json,.zip` |

---

## Task 1: Install Dependencies + Config

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install react-easy-crop jszip
```

- [ ] **Step 2: Install test dependency**

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 3: Update vite.config.ts coverage includes**

In `vite.config.ts`, replace the `coverage.include` array (lines 15-20) with:

```ts
      include: [
        'src/store/**/*.ts',
        'src/layout/**/*.ts',
        'src/utils/**/*.ts',
        'src/i18n/**/*.ts',
        'src/hooks/**/*.ts',
      ],
```

- [ ] **Step 4: Verify build still works**

Run: `npm run build`
Expected: build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "Add react-easy-crop, jszip, fake-indexeddb dependencies"
```

---

## Task 2: Extend Types + i18n Keys

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/en.ts`

- [ ] **Step 1: Extend Person type and add ImageMeta**

In `src/types/index.ts`, add `avatarImageId` and `galleryImageIds` to the `Person` interface (after `bio?: string;` on line 16), and add the `ImageMeta` interface at the end of the file.

The full file should look like:

```ts
export type Gender = 'male' | 'female' | 'unknown';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: number;
  deathYear?: string;
  title?: string;
  generation: number;
  spouseIds: string[];
  childrenIds: string[];
  parentIds: string[];
  collapsed: boolean;
  parentCollapsed?: boolean;
  bio?: string;
  avatarImageId?: string;
  galleryImageIds?: string[];
}

export type RelationType = 'father' | 'mother' | 'son' | 'daughter' | 'husband' | 'wife';

export interface LayoutNode {
  id: string;
  spouseIds: string[];
  generation: number;
  x: number;
  y: number;
  childrenUnitIds: string[];
  collapsed: boolean;
}

export interface ImageMeta {
  id: string;
  personId: string;
  format: string;
  kind: 'avatar' | 'gallery';
}
```

- [ ] **Step 2: Add Chinese translation keys**

In `src/i18n/zh.ts`, add these keys at the end of the object (before the closing `};` on line 253, after `relRelative: '亲属',`):

```ts
  relRelative: '亲属',

  // Person images
  setAvatar: '设置头像',
  gallery: '相册',
  uploadImage: '上传图片',
  editGallery: '编辑',
  doneEditing: '完成',
  deleteImage: '删除图片',
  setAsAvatar: '设为头像',
  cropAvatar: '裁剪头像',
  confirmCrop: '确认',
  galleryFull: '最多9张图片',
  noGalleryImages: '暂无图片，点击上传',
  prevImage: '上一张',
  nextImage: '下一张',
  dragToReorder: '拖动排序',
```

- [ ] **Step 3: Add English translation keys**

In `src/i18n/en.ts`, add the matching keys at the end of the object (before the closing `};`). Find the last key `relRelative` and add after it:

```ts
  relRelative: 'Relative',

  // Person images
  setAvatar: 'Set Avatar',
  gallery: 'Gallery',
  uploadImage: 'Upload',
  editGallery: 'Edit',
  doneEditing: 'Done',
  deleteImage: 'Delete',
  setAsAvatar: 'Set as Avatar',
  cropAvatar: 'Crop Avatar',
  confirmCrop: 'Confirm',
  galleryFull: 'Maximum 9 images',
  noGalleryImages: 'No images yet. Click to upload.',
  prevImage: 'Previous',
  nextImage: 'Next',
  dragToReorder: 'Drag to reorder',
```

- [ ] **Step 4: Verify type-check passes**

Run: `npm run build`
Expected: build succeeds (zh.ts keys define the type, en.ts must match)

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/i18n/zh.ts src/i18n/en.ts
git commit -m "Add image types and i18n keys for avatar/gallery"
```

---

## Task 3: Image Compression Utility

**Files:**
- Create: `src/utils/imageCompression.ts`
- Create: `src/utils/imageCompression.test.ts`

- [ ] **Step 1: Create the compression utility**

Create `src/utils/imageCompression.ts`:

```ts
const MAX_DIMENSION = 1200;
const QUALITY = 0.85;
const SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB

export function shouldCompress(blob: Blob): boolean {
  return blob.size > SIZE_THRESHOLD;
}

export async function compressImage(blob: Blob): Promise<Blob> {
  if (!shouldCompress(blob)) return blob;

  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  let newWidth = width;
  let newHeight = height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      newWidth = MAX_DIMENSION;
      newHeight = Math.round((height / width) * MAX_DIMENSION);
    } else {
      newHeight = MAX_DIMENSION;
      newWidth = Math.round((width / height) * MAX_DIMENSION);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', QUALITY).then((dataUrl) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const bstr = atob(arr[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  });
}

export function getImageFormat(blob: Blob): string {
  const type = blob.type;
  if (type === 'image/jpeg') return 'jpeg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpeg';
}
```

- [ ] **Step 2: Create the test file**

Create `src/utils/imageCompression.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shouldCompress, compressImage, getImageFormat } from './imageCompression';

describe('shouldCompress', () => {
  it('returns false for blobs under 2MB', () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    expect(shouldCompress(blob)).toBe(false);
  });

  it('returns true for blobs over 2MB', () => {
    const data = new Uint8Array(2 * 1024 * 1024 + 1);
    const blob = new Blob([data], { type: 'image/jpeg' });
    expect(shouldCompress(blob)).toBe(true);
  });

  it('returns false for exactly 2MB', () => {
    const data = new Uint8Array(2 * 1024 * 1024);
    const blob = new Blob([data], { type: 'image/jpeg' });
    expect(shouldCompress(blob)).toBe(false);
  });
});

describe('getImageFormat', () => {
  it('detects jpeg', () => {
    expect(getImageFormat(new Blob([], { type: 'image/jpeg' }))).toBe('jpeg');
  });

  it('detects png', () => {
    expect(getImageFormat(new Blob([], { type: 'image/png' }))).toBe('png');
  });

  it('detects webp', () => {
    expect(getImageFormat(new Blob([], { type: 'image/webp' }))).toBe('webp');
  });

  it('defaults to jpeg for unknown types', () => {
    expect(getImageFormat(new Blob([], { type: 'image/bmp' }))).toBe('jpeg');
  });
});

describe('compressImage', () => {
  beforeEach(() => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 2000,
      height: 1000,
      close: vi.fn(),
    }));

    const mockCtx = {
      drawImage: vi.fn(),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,/9j/4AAQ'),
    };
    vi.stubGlobal('document', {
      ...document,
      createElement: vi.fn().mockReturnValue(mockCanvas),
    });
  });

  it('returns original blob if under threshold', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    const result = await compressImage(blob);
    expect(result).toBe(blob);
  });

  it('compresses large blobs', async () => {
    const data = new Uint8Array(3 * 1024 * 1024);
    const blob = new Blob([data], { type: 'image/jpeg' });
    const result = await compressImage(blob);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/utils/imageCompression.test.ts`
Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/imageCompression.ts src/utils/imageCompression.test.ts
git commit -m "Add image compression utility"
```

---

## Task 4: IndexedDB Image Storage Layer

**Files:**
- Create: `src/store/imageDb.ts`
- Create: `src/store/imageDb.test.ts`

- [ ] **Step 1: Create the IndexedDB layer**

Create `src/store/imageDb.ts`:

```ts
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
```

- [ ] **Step 2: Create the test file**

Create `src/store/imageDb.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import {
  saveImage,
  getImage,
  deleteImage,
  deleteImagesForPerson,
  getAllImagesForExport,
  bulkImportImages,
  clearAllImages,
} from './imageDb';
import type { ImageMeta } from '../types';

function makeMeta(overrides: Partial<ImageMeta> = {}): ImageMeta {
  return {
    id: 'img1',
    personId: 'p1',
    format: 'jpeg',
    kind: 'gallery',
    ...overrides,
  };
}

function makeBlob(): Blob {
  return new Blob(['fake-image-data'], { type: 'image/jpeg' });
}

beforeEach(async () => {
  await clearAllImages();
});

afterAll(async () => {
  await clearAllImages();
});

describe('saveImage / getImage', () => {
  it('saves and retrieves an image', async () => {
    const meta = makeMeta();
    const blob = makeBlob();
    await saveImage(meta, blob);

    const result = await getImage('img1');
    expect(result).not.toBeNull();
    expect(result!.format).toBe('jpeg');
    expect(result!.blob.size).toBe(blob.size);
  });

  it('returns null for non-existent image', async () => {
    const result = await getImage('nonexistent');
    expect(result).toBeNull();
  });
});

describe('deleteImage', () => {
  it('deletes an existing image', async () => {
    await saveImage(makeMeta(), makeBlob());
    await deleteImage('img1');
    expect(await getImage('img1')).toBeNull();
  });

  it('does not throw for non-existent image', async () => {
    await expect(deleteImage('nonexistent')).resolves.toBeUndefined();
  });
});

describe('deleteImagesForPerson', () => {
  it('deletes all images for a person', async () => {
    await saveImage(makeMeta({ id: 'img1' }), makeBlob());
    await saveImage(makeMeta({ id: 'img2' }), makeBlob());
    await saveImage(makeMeta({ id: 'img3', personId: 'p2' }), makeBlob());

    await deleteImagesForPerson('p1');

    expect(await getImage('img1')).toBeNull();
    expect(await getImage('img2')).toBeNull();
    expect(await getImage('img3')).not.toBeNull();
  });
});

describe('getAllImagesForExport', () => {
  it('returns all images', async () => {
    await saveImage(makeMeta({ id: 'img1', kind: 'avatar' }), makeBlob());
    await saveImage(makeMeta({ id: 'img2', kind: 'gallery' }), makeBlob());

    const result = await getAllImagesForExport();
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id).sort()).toEqual(['img1', 'img2']);
  });

  it('returns empty array when no images', async () => {
    const result = await getAllImagesForExport();
    expect(result).toEqual([]);
  });
});

describe('bulkImportImages', () => {
  it('inserts multiple images', async () => {
    const entries = [
      { id: 'a', personId: 'p1', blob: makeBlob(), format: 'jpeg', kind: 'gallery' as const },
      { id: 'b', personId: 'p1', blob: makeBlob(), format: 'png', kind: 'avatar' as const },
    ];

    await bulkImportImages(entries);

    expect(await getImage('a')).not.toBeNull();
    expect(await getImage('b')).not.toBeNull();
    expect((await getImage('b'))!.format).toBe('png');
  });
});

describe('clearAllImages', () => {
  it('removes all images', async () => {
    await saveImage(makeMeta({ id: 'img1' }), makeBlob());
    await saveImage(makeMeta({ id: 'img2' }), makeBlob());

    await clearAllImages();

    expect(await getAllImagesForExport()).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/store/imageDb.test.ts`
Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/store/imageDb.ts src/store/imageDb.test.ts
git commit -m "Add IndexedDB image storage layer"
```

---

## Task 5: Extend localDb Validation

**Files:**
- Modify: `src/store/localDb.ts`
- Modify: `src/store/localDb.test.ts`

- [ ] **Step 1: Add avatarImageId/galleryImageIds validation to validatePerson**

In `src/store/localDb.ts`, modify the `validatePerson` function. After the `bio` validation block (after line 43 `if (bio !== undefined && typeof bio !== 'string') { ... }`), add validation for the two new fields. Also update the destructure on line 16 and the return object starting at line 65.

Replace lines 16-17 (the destructure) with:

```ts
  const { id, name, gender, birthYear, deathYear, title, generation,
          spouseIds, childrenIds, parentIds, collapsed, parentCollapsed, bio,
          avatarImageId, galleryImageIds } = raw;
```

After the bio validation block (after line 43), add:

```ts
  if (avatarImageId !== undefined && typeof avatarImageId !== 'string') {
    throw new Error(`Invalid person "${key}": avatarImageId must be a string if provided`);
  }
  if (galleryImageIds !== undefined) {
    if (!Array.isArray(galleryImageIds) || !galleryImageIds.every((g): g is string => typeof g === 'string')) {
      throw new Error(`Invalid person "${key}": galleryImageIds must be a string array if provided`);
    }
  }
```

In the return object (after the bio spread on line 78), add before the closing `};`:

```ts
    ...(avatarImageId !== undefined ? { avatarImageId } : {}),
    ...(galleryImageIds !== undefined ? { galleryImageIds } : {}),
```

- [ ] **Step 2: Extend importData to handle images map**

In `src/store/localDb.ts`, add `images` parsing to the `importData` function. After the `treeNames` validation (line 191), the return object needs to stay as-is — the `images` field is only for export, not stored in `LocalData`. Instead, add a new function below `importData`:

```ts
export function extractImageMeta(parsed: unknown): Record<string, ImageMeta> | undefined {
  if (!isPlainObject(parsed)) return undefined;
  const raw = (parsed as Record<string, unknown>).images;
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) throw new Error('Invalid data format: images must be an object');
  const result: Record<string, ImageMeta> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isPlainObject(v)) throw new Error(`Invalid data format: images["${k}"] must be an object`);
    const { id, personId, format, kind } = v as Record<string, unknown>;
    if (typeof id !== 'string' || typeof personId !== 'string' || typeof format !== 'string') {
      throw new Error(`Invalid data format: images["${k}"] has invalid metadata`);
    }
    if (kind !== 'avatar' && kind !== 'gallery') {
      throw new Error(`Invalid data format: images["${k}"] kind must be avatar|gallery`);
    }
    result[k] = { id, personId, format, kind };
  }
  return result;
}
```

Also add `import type { ImageMeta } from '../types';` at the top of the file (line 1).

- [ ] **Step 3: Add tests for new validation**

In `src/store/localDb.test.ts`, add a new `describe` block at the end of the file (after the `saveLocalData` describe block):

```ts
describe('avatarImageId / galleryImageIds validation', () => {
  it('accepts valid avatarImageId', () => {
    const person = createValidPerson({ avatarImageId: 'img1' });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    const result = importData(JSON.stringify(data));
    expect(result.persons.p1.avatarImageId).toBe('img1');
  });

  it('accepts valid galleryImageIds', () => {
    const person = createValidPerson({ galleryImageIds: ['img1', 'img2'] });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    const result = importData(JSON.stringify(data));
    expect(result.persons.p1.galleryImageIds).toEqual(['img1', 'img2']);
  });

  it('throws on non-string avatarImageId', () => {
    const person = createValidPerson({ avatarImageId: 123 });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    expect(() => importData(JSON.stringify(data))).toThrow('avatarImageId must be a string');
  });

  it('throws on non-array galleryImageIds', () => {
    const person = createValidPerson({ galleryImageIds: 'bad' });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    expect(() => importData(JSON.stringify(data))).toThrow('galleryImageIds must be a string array');
  });

  it('throws on galleryImageIds with non-string elements', () => {
    const person = createValidPerson({ galleryImageIds: ['ok', 5] });
    const data = { ...createValidLocalData(), persons: { p1: person } };
    expect(() => importData(JSON.stringify(data))).toThrow('galleryImageIds must be a string array');
  });

  it('works without avatarImageId/galleryImageIds (backward compat)', () => {
    const data = createValidLocalData();
    const result = importData(JSON.stringify(data));
    expect(result.persons.p1.avatarImageId).toBeUndefined();
    expect(result.persons.p1.galleryImageIds).toBeUndefined();
  });
});
```

Also add the import at the top:

```ts
import { extractImageMeta } from './localDb';
```

And add tests for `extractImageMeta`:

```ts
describe('extractImageMeta', () => {
  it('returns undefined when no images field', () => {
    expect(extractImageMeta({ persons: {} })).toBeUndefined();
  });

  it('parses valid images map', () => {
    const parsed = {
      images: {
        img1: { id: 'img1', personId: 'p1', format: 'jpeg', kind: 'gallery' },
      },
    };
    const result = extractImageMeta(parsed);
    expect(result).toEqual({
      img1: { id: 'img1', personId: 'p1', format: 'jpeg', kind: 'gallery' },
    });
  });

  it('throws on invalid kind', () => {
    const parsed = {
      images: {
        img1: { id: 'img1', personId: 'p1', format: 'jpeg', kind: 'bad' },
      },
    };
    expect(() => extractImageMeta(parsed)).toThrow('kind must be avatar|gallery');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/localDb.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/localDb.ts src/store/localDb.test.ts
git commit -m "Add avatarImageId/galleryImageIds validation to localDb"
```

---

## Task 6: useImageUrl Hook

**Files:**
- Create: `src/hooks/useImageUrl.ts`
- Create: `src/hooks/useImageUrl.test.ts`

- [ ] **Step 1: Create the hooks**

Create `src/hooks/useImageUrl.ts`:

```ts
import { useState, useEffect } from 'react';
import { getImage } from '../store/imageDb';
import { useFamilyStore } from '../store/familyStore';

export function useImageUrl(imageId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    getImage(imageId).then((result) => {
      if (cancelled) return;
      if (result) {
        objectUrl = URL.createObjectURL(result.blob);
        setUrl(objectUrl);
      } else {
        setUrl(null);
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  return url;
}

export function useAvatarUrl(personId: string | undefined): string | null {
  const avatarImageId = useFamilyStore((s) =>
    personId ? s.persons[personId]?.avatarImageId : undefined,
  );
  return useImageUrl(avatarImageId);
}
```

- [ ] **Step 2: Create the test file**

Create `src/hooks/useImageUrl.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useImageUrl } from './useImageUrl';
import { saveImage, clearAllImages } from '../store/imageDb';
import type { ImageMeta } from '../types';

function makeMeta(overrides: Partial<ImageMeta> = {}): ImageMeta {
  return { id: 'img1', personId: 'p1', format: 'jpeg', kind: 'gallery', ...overrides };
}

beforeEach(async () => {
  await clearAllImages();
});

describe('useImageUrl', () => {
  it('returns null for undefined imageId', () => {
    const { result } = renderHook(() => useImageUrl(undefined));
    expect(result.current).toBeNull();
  });

  it('returns null for non-existent image', async () => {
    const { result } = renderHook(() => useImageUrl('nonexistent'));
    await new Promise((r) => setTimeout(r, 100));
    expect(result.current).toBeNull();
  });

  it('returns object URL for existing image', async () => {
    const blob = new Blob(['data'], { type: 'image/jpeg' });
    await saveImage(makeMeta({ id: 'img-test' }), blob);

    const { result } = renderHook(() => useImageUrl('img-test'));
    await new Promise((r) => setTimeout(r, 100));
    expect(result.current).not.toBeNull();
    expect(result.current).toMatch(/^blob:/);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/hooks/useImageUrl.test.ts`
Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useImageUrl.ts src/hooks/useImageUrl.test.ts
git commit -m "Add useImageUrl and useAvatarUrl hooks"
```

---

## Task 7: Extend familyStore (Delete Cleanup + updatePerson)

**Files:**
- Modify: `src/store/familyStore.ts`

- [ ] **Step 1: Extend updatePerson type signature**

In `src/store/familyStore.ts`, update the `updatePerson` type in the `FamilyState` interface (line 40). Change it to also accept the new image fields:

```ts
  updatePerson: (id: string, patch: Partial<Pick<Person, 'name' | 'gender' | 'birthYear' | 'deathYear' | 'bio' | 'title' | 'avatarImageId' | 'galleryImageIds'>>) => void;
```

- [ ] **Step 2: Import deleteImagesForPerson**

At the top of `src/store/familyStore.ts`, add to the existing import from `./localDb` or add a new import:

```ts
import { deleteImagesForPerson } from './imageDb';
```

Add this after line 6 (`import type { LocalData } from './localDb';`).

- [ ] **Step 3: Add image cleanup to removePerson**

In the `removePerson` action (around line 255), after `delete next[id];` (line 287) and before the `const update = {` block, add:

```ts
          deleteImagesForPerson(id);
```

- [ ] **Step 4: Add image cleanup to removePersons**

In the `removePersons` action (around line 646), inside the `for (const id of ids)` loop after `delete next[id];` (line 680), add:

```ts
            deleteImagesForPerson(id);
```

- [ ] **Step 5: Verify type-check and tests pass**

Run: `npm run build && npm test`
Expected: build succeeds, all existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add src/store/familyStore.ts
git commit -m "Clean up IndexedDB images on person deletion; extend updatePerson"
```

---

## Task 8: Avatar on PersonCard

**Files:**
- Modify: `src/components/PersonCard.tsx`
- Modify: `src/components/PersonCard.css`

- [ ] **Step 1: Add avatar rendering to PersonCard**

In `src/components/PersonCard.tsx`, add imports at the top (after the existing imports, before `import './PersonCard.css';`):

```ts
import { useAvatarUrl } from '../hooks/useImageUrl';
```

Inside the component, after the `const isSelectedCard = ...` line (line 59), add:

```ts
  const avatarUrl = useAvatarUrl(person.id);
```

For the **Chinese card** (the `else` branch for vertical name layout), modify the `nameStartY` to account for avatar space. Find the Chinese layout block (around line 97):

```ts
    const nameStartY = 16;
    const lineHeight = 17;
```

Change to:

```ts
    const nameStartY = avatarUrl ? 30 : 16;
    const lineHeight = 17;
```

Before the `return (` statement (before line 136), add the avatar SVG element definition. We'll insert it into the JSX. After the `<rect ... />` element that renders the card background (after line 176, the closing `/>` of the rect's onMouseDown/onTouchStart), add the avatar rendering. Insert this JSX block right after the closing `/>` of the `<rect>` and before `{nameElements}`:

```tsx
      {avatarUrl && (
        <defs>
          <clipPath id={`avatar-clip-${person.id}`}>
            <circle cx={CARD_WIDTH / 2} cy={14} r={11} />
          </clipPath>
        </defs>
      )}
      {avatarUrl && (
        <image
          href={avatarUrl}
          x={CARD_WIDTH / 2 - 11}
          y={3}
          width={22}
          height={22}
          clipPath={`url(#avatar-clip-${person.id})`}
          preserveAspectRatio="xMidYMid slice"
          className="card-avatar"
        />
      )}
```

- [ ] **Step 2: Add CSS for avatar**

In `src/components/PersonCard.css`, add at the end of the file:

```css
.card-avatar {
  pointer-events: none;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/PersonCard.tsx src/components/PersonCard.css
git commit -m "Render avatar circle on PersonCard via SVG clipPath"
```

---

## Task 9: CropModal Component

**Files:**
- Create: `src/components/CropModal.tsx`
- Create: `src/components/CropModal.css`

- [ ] **Step 1: Create CropModal component**

Create `src/components/CropModal.tsx`:

```tsx
import React, { useState, useCallback, useRef } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { v4 as uuid } from 'uuid';
import { useFamilyStore } from '../store/familyStore';
import { saveImage } from '../store/imageDb';
import { getImageFormat } from '../utils/imageCompression';
import { useT } from '../i18n';
import './CropModal.css';

interface Props {
  personId: string;
  sourceUrl: string;
  sourceBlob: Blob;
  onClose: () => void;
}

export const CropModal: React.FC<Props> = ({ personId, sourceUrl, sourceBlob, onClose }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const t = useT();

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const produceCroppedBlob = async (): Promise<Blob> => {
    if (!croppedAreaPixels) return sourceBlob;

    const img = new Image();
    img.src = sourceUrl;
    await new Promise((resolve) => { img.onload = resolve; });

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      256,
      256,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
    });
  };

  const handleConfirm = async () => {
    const blob = await produceCroppedBlob();
    const imageId = uuid();
    const format = getImageFormat(blob);
    await saveImage(
      { id: imageId, personId, format, kind: 'avatar' },
      blob,
    );
    updatePerson(personId, { avatarImageId: imageId });
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('cropAvatar')}</h3>
        <div className="crop-container">
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="crop-controls">
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn-confirm" onClick={handleConfirm}>
            {t('confirmCrop')}
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create CropModal CSS**

Create `src/components/CropModal.css`:

```css
.crop-modal {
  background: white;
  border-radius: 12px;
  padding: 20px;
  width: 90vw;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.crop-modal h3 {
  margin: 0 0 16px 0;
  text-align: center;
}

.crop-container {
  position: relative;
  width: 100%;
  height: 350px;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.crop-controls {
  margin-bottom: 16px;
}

.crop-controls input[type="range"] {
  width: 100%;
}

.crop-modal .dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/CropModal.tsx src/components/CropModal.css
git commit -m "Add CropModal component with react-easy-crop for 1:1 avatar"
```

---

## Task 10: GalleryModal Component

**Files:**
- Create: `src/components/GalleryModal.tsx`
- Create: `src/components/GalleryModal.css`

- [ ] **Step 1: Create GalleryModal component**

Create `src/components/GalleryModal.tsx`:

```tsx
import React, { useState, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { useFamilyStore } from '../store/familyStore';
import { saveImage, getImage, deleteImage } from '../store/imageDb';
import { compressImage, getImageFormat } from '../utils/imageCompression';
import { useImageUrl } from '../hooks/useImageUrl';
import { CropModal } from './CropModal';
import { useT } from '../i18n';
import './GalleryModal.css';

const MAX_IMAGES = 9;

interface Props {
  personId: string;
  onClose: () => void;
}

export const GalleryModal: React.FC<Props> = ({ personId, onClose }) => {
  const person = useFamilyStore((s) => s.persons[personId]);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const t = useT();

  const [editMode, setEditMode] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [cropSource, setCropSource] = useState<{ url: string; blob: Blob } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!person) return null;

  const galleryIds = person.galleryImageIds ?? [];

  const handleUpload = async (files: FileList) => {
    const remaining = MAX_IMAGES - galleryIds.length;
    const toAdd = Array.from(files).slice(0, remaining);

    const newIds: string[] = [];
    for (const file of toAdd) {
      const compressed = await compressImage(file);
      const format = getImageFormat(compressed);
      const imageId = uuid();
      await saveImage({ id: imageId, personId, format, kind: 'gallery' }, compressed);
      newIds.push(imageId);
    }

    updatePerson(personId, { galleryImageIds: [...galleryIds, ...newIds] });
  };

  const handleDelete = async (imageId: string) => {
    await deleteImage(imageId);
    const next = galleryIds.filter((id) => id !== imageId);
    updatePerson(personId, { galleryImageIds: next });
    if (person.avatarImageId === imageId) {
      updatePerson(personId, { avatarImageId: undefined });
    }
    setSelectedIdx(null);
  };

  const handleSetAsAvatar = async (imageId: string) => {
    const result = await getImage(imageId);
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    setCropSource({ url, blob: result.blob });
  };

  const handleReorder = (fromIdx: number, toIdx: number) => {
    const next = [...galleryIds];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updatePerson(personId, { galleryImageIds: next });
  };

  const selectedId = selectedIdx !== null ? galleryIds[selectedIdx] : null;

  return (
    <>
      <div className="dialog-overlay" onClick={onClose}>
        <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gallery-header">
            <h3>{t('gallery')}</h3>
            <div className="gallery-header-actions">
              {galleryIds.length > 0 && (
                <button
                  className="gallery-edit-btn"
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? t('doneEditing') : t('editGallery')}
                </button>
              )}
              <button className="close-btn" onClick={onClose}>✕</button>
            </div>
          </div>

          {selectedId && !editMode && (
            <LargeImageView
              imageId={selectedId}
              onPrev={() => setSelectedIdx(Math.max(0, (selectedIdx ?? 0) - 1))}
              onNext={() => setSelectedIdx(Math.min(galleryIds.length - 1, (selectedIdx ?? 0) + 1))}
              onSetAvatar={() => handleSetAsAvatar(selectedId)}
              canPrev={(selectedIdx ?? 0) > 0}
              canNext={(selectedIdx ?? 0) < galleryIds.length - 1}
            />
          )}

          <div className="gallery-grid">
            {galleryIds.length === 0 && (
              <div className="gallery-empty">{t('noGalleryImages')}</div>
            )}
            {galleryIds.map((imageId, idx) => (
              <GalleryThumb
                key={imageId}
                imageId={imageId}
                editMode={editMode}
                onClick={() => !editMode && setSelectedIdx(idx)}
                onDelete={() => handleDelete(imageId)}
                draggable={editMode}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== idx) {
                    handleReorder(dragIdx, idx);
                  }
                  setDragIdx(null);
                }}
              />
            ))}
            {!editMode && galleryIds.length < MAX_IMAGES && (
              <button
                className="gallery-upload-tile"
                onClick={() => fileInputRef.current?.click()}
              >
                <span>+</span>
              </button>
            )}
          </div>

          {editMode && (
            <div className="gallery-edit-bar">
              <span className="gallery-count">{galleryIds.length}/{MAX_IMAGES}</span>
              <button
                className="gallery-upload-btn"
                disabled={galleryIds.length >= MAX_IMAGES}
                onClick={() => fileInputRef.current?.click()}
              >
                {galleryIds.length >= MAX_IMAGES ? t('galleryFull') : t('uploadImage')}
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) handleUpload(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
        </div>
      </div>

      {cropSource && (
        <CropModal
          personId={personId}
          sourceUrl={cropSource.url}
          sourceBlob={cropSource.blob}
          onClose={() => {
            URL.revokeObjectURL(cropSource.url);
            setCropSource(null);
          }}
        />
      )}
    </>
  );
};

interface ThumbProps {
  imageId: string;
  editMode: boolean;
  onClick: () => void;
  onDelete: () => void;
  draggable: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}

const GalleryThumb: React.FC<ThumbProps> = ({
  imageId,
  editMode,
  onClick,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const url = useImageUrl(imageId);
  return (
    <div
      className={`gallery-thumb ${editMode ? 'editable' : ''}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {url && <img src={url} alt="" />}
      {editMode && (
        <button className="thumb-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          ✕
        </button>
      )}
    </div>
  );
};

interface LargeViewProps {
  imageId: string;
  onPrev: () => void;
  onNext: () => void;
  onSetAvatar: () => void;
  canPrev: boolean;
  canNext: boolean;
}

const LargeImageView: React.FC<LargeViewProps> = ({
  imageId,
  onPrev,
  onNext,
  onSetAvatar,
  canPrev,
  canNext,
}) => {
  const url = useImageUrl(imageId);
  const t = useT();
  return (
    <div className="gallery-large">
      {canPrev && <button className="gallery-nav prev" onClick={onPrev}>‹</button>}
      {url && <img src={url} alt="" className="gallery-large-img" />}
      {canNext && <button className="gallery-nav next" onClick={onNext}>›</button>}
      <button className="gallery-set-avatar" onClick={onSetAvatar}>
        {t('setAsAvatar')}
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Create GalleryModal CSS**

Create `src/components/GalleryModal.css`:

```css
.gallery-modal {
  background: white;
  border-radius: 12px;
  padding: 20px;
  width: 90vw;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.gallery-header h3 {
  margin: 0;
}

.gallery-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.gallery-edit-btn {
  background: #f0f0f0;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.gallery-edit-btn:hover {
  background: #e0e0e0;
}

.gallery-large {
  position: relative;
  width: 100%;
  height: 300px;
  background: #1a1a1a;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  overflow: hidden;
}

.gallery-large-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.gallery-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 28px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-nav.prev { left: 8px; }
.gallery-nav.next { right: 8px; }

.gallery-nav:hover {
  background: rgba(255, 255, 255, 0.4);
}

.gallery-set-avatar {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(74, 144, 217, 0.9);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.gallery-set-avatar:hover {
  background: #4a90d9;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.gallery-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.gallery-thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
  cursor: pointer;
}

.gallery-thumb.editable {
  cursor: grab;
}

.gallery-thumb.editable:active {
  cursor: grabbing;
}

.gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(231, 76, 60, 0.9);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-upload-tile {
  aspect-ratio: 1;
  border: 2px dashed #ccc;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #ccc;
}

.gallery-upload-tile:hover {
  border-color: #4a90d9;
  color: #4a90d9;
}

.gallery-edit-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gallery-count {
  color: #666;
  font-size: 13px;
}

.gallery-upload-btn {
  background: #4a90d9;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.gallery-upload-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/GalleryModal.tsx src/components/GalleryModal.css
git commit -m "Add GalleryModal with view/edit/reorder/upload"
```

---

## Task 11: Sidebar Integration

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/Sidebar.css`

- [ ] **Step 1: Add imports and state to Sidebar**

In `src/components/Sidebar.tsx`, add imports after the existing imports (before `import './Sidebar.css';`):

```ts
import { useAvatarUrl } from '../hooks/useImageUrl';
import { CropModal } from './CropModal';
import { GalleryModal } from './GalleryModal';
import { v4 as uuid } from 'uuid';
```

Inside the component, after the state declarations (after line 24 `const [editDeathYear, setEditDeathYear] = useState('');`), add:

```ts
  const [showCrop, setShowCrop] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [avatarFileUrl, setAvatarFileUrl] = useState<string | null>(null);
  const [avatarFileBlob, setAvatarFileBlob] = useState<Blob | null>(null);
  const avatarUrl = useAvatarUrl(person?.id);
  const avatarFileRef = useRef<HTMLInputElement>(null);
```

Also add `useRef` to the React import at line 1:

```ts
import React, { useState, useRef } from 'react';
```

- [ ] **Step 2: Add avatar file picker handler**

After the `handleDelete` function (around line 57), add:

```ts
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarFileUrl(url);
    setAvatarFileBlob(file);
    setShowCrop(true);
    if (avatarFileRef.current) avatarFileRef.current.value = '';
  };

  const closeCrop = () => {
    setShowCrop(false);
    if (avatarFileUrl) URL.revokeObjectURL(avatarFileUrl);
    setAvatarFileUrl(null);
    setAvatarFileBlob(null);
  };
```

- [ ] **Step 3: Add avatar display + buttons to sidebar JSX**

In the non-editing branch (the `<>` fragment starting around line 126), add the avatar section. Before the `<div className="sidebar-info">` (line 127), insert:

```tsx
            <div className="sidebar-avatar-section">
              <div className="sidebar-avatar" onClick={() => setShowGallery(true)}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={person.name} />
                ) : (
                  <div className="sidebar-avatar-placeholder">
                    {person.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="sidebar-avatar-buttons">
                <button
                  className="sidebar-avatar-btn"
                  onClick={() => avatarFileRef.current?.click()}
                >
                  {t('setAvatar')}
                </button>
                <button
                  className="sidebar-avatar-btn"
                  onClick={() => setShowGallery(true)}
                >
                  {t('gallery')}
                </button>
              </div>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarFile}
              />
            </div>
```

At the end of the component, before the closing `</div>` of `<div className="sidebar">` (before the final `</>` or `</div>`), add the modals. After the sidebar-actions div and before `</>`:

```tsx
            {showCrop && avatarFileUrl && avatarFileBlob && (
              <CropModal
                personId={person.id}
                sourceUrl={avatarFileUrl}
                sourceBlob={avatarFileBlob}
                onClose={closeCrop}
              />
            )}
            {showGallery && (
              <GalleryModal
                personId={person.id}
                onClose={() => setShowGallery(false)}
              />
            )}
```

- [ ] **Step 4: Add CSS for sidebar avatar**

In `src/components/Sidebar.css`, add at the end:

```css
.sidebar-avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.sidebar-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  background: #f0f0f0;
  cursor: pointer;
  flex-shrink: 0;
}

.sidebar-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #999;
  background: #e8e8e8;
}

.sidebar-avatar-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-avatar-btn {
  background: #f0f0f0;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.sidebar-avatar-btn:hover {
  background: #e0e0e0;
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.css
git commit -m "Add avatar display, gallery and crop entry points to Sidebar"
```

---

## Task 12: Export/Import Zip

**Files:**
- Modify: `src/store/useDataIO.ts`
- Modify: `src/components/DataManager.tsx`

- [ ] **Step 1: Rewrite useDataIO for zip export + dual import**

Replace the entire contents of `src/store/useDataIO.ts` with:

```ts
import { useRef } from 'react';
import JSZip from 'jszip';
import { useFamilyStore } from './familyStore';
import { exportData, importData, extractImageMeta, saveLocalDataImmediate } from './localDb';
import {
  getAllImagesForExport,
  bulkImportImages,
  clearAllImages,
} from './imageDb';
import type { ImageMeta } from '../types';

function getExportFileName(): string {
  const locale = useFamilyStore.getState();
  return '族谱数据.zip';
}

export function useDataIO() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const state = useFamilyStore.getState();
    const baseData = {
      persons: state.persons,
      siblingOrder: state.siblingOrder,
      spouseOrder: state.spouseOrder,
      selectedPersonId: state.selectedPersonId,
      currentTree: state.currentTree,
      treeNames: state.treeNames,
    };

    const allImages = await getAllImagesForExport();
    const imagesMeta: Record<string, ImageMeta> = {};
    for (const img of allImages) {
      imagesMeta[img.id] = {
        id: img.id,
        personId: img.personId,
        format: img.format,
        kind: img.kind,
      };
    }

    const exportPayload = { ...baseData, images: imagesMeta };
    const jsonStr = exportData(exportPayload as any);

    const zip = new JSZip();
    zip.file('data.json', jsonStr);

    for (const img of allImages) {
      const path = `images/${img.personId}/${img.id}.${img.format}`;
      zip.file(path, img.blob);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getExportFileName();
    a.click();
    URL.revokeObjectURL(url);
    state.markExported();
  };

  const handleImport = () => {
    if (!window.confirm('导入将覆盖当前所有数据，确定继续吗？')) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const jsonFile = zip.file('data.json');
        if (!jsonFile) throw new Error('Zip missing data.json');

        const jsonStr = await jsonFile.async('string');
        const data = importData(jsonStr);

        await clearAllImages();

        const parsed = JSON.parse(jsonStr);
        const imagesMeta = extractImageMeta(parsed);

        if (imagesMeta) {
          const entries: Array<{ id: string; personId: string; blob: Blob; format: string; kind: 'avatar' | 'gallery' }> = [];
          for (const meta of Object.values(imagesMeta)) {
            const path = `images/${meta.personId}/${meta.id}.${meta.format}`;
            const imgFile = zip.file(path);
            if (imgFile) {
              const blob = await imgFile.async('blob');
              entries.push({
                id: meta.id,
                personId: meta.personId,
                blob,
                format: meta.format,
                kind: meta.kind,
              });
            }
          }
          await bulkImportImages(entries);
        }

        const importState = { ...data, currentTree: null as string | null };
        useFamilyStore.setState({
          ...importState,
          _hydrated: true,
          _dirtyAfterExport: false,
          availableTrees: [],
          anchorPersonId: null,
          relationMode: false,
          relationPickedIds: [],
          relationPath: null,
          showTreeManager: false,
        });
        saveLocalDataImmediate(importState);
        useFamilyStore.getState().fetchTrees();
      } else {
        await clearAllImages();
        const text = await file.text();
        const data = importData(text);
        const importState = { ...data, currentTree: null as string | null };
        useFamilyStore.setState({
          ...importState,
          _hydrated: true,
          _dirtyAfterExport: false,
          availableTrees: [],
          anchorPersonId: null,
          relationMode: false,
          relationPickedIds: [],
          relationPath: null,
          showTreeManager: false,
        });
        saveLocalDataImmediate(importState);
        useFamilyStore.getState().fetchTrees();
      }
    } catch {
      alert('导入失败：文件格式不正确');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return { fileInputRef, handleExport, handleImport, handleFileChange };
}
```

- [ ] **Step 2: Update DataManager file accept**

In `src/components/DataManager.tsx`, change the `accept` attribute on the file input (line 20) from `.json` to `.json,.zip`:

```tsx
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/store/useDataIO.ts src/components/DataManager.tsx
git commit -m "Export as zip with images; import supports both json and zip"
```

---

## Task 13: Final Verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors (fix any that appear)

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: build succeeds with no type errors

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

Test the following:
1. Select a person → sidebar shows avatar placeholder + "Set Avatar" / "Gallery" buttons
2. Click "Set Avatar" → file picker → select image → crop modal opens → pan/zoom → confirm → avatar appears on sidebar + tree card
3. Click "Gallery" → gallery modal → click "Edit" → "Upload" → select multiple images → appear in grid
4. In edit mode → drag thumbnails to reorder → exit edit mode
5. Click a thumbnail → large image view → "Set as Avatar" → crop modal → confirm
6. Click "Export" → downloads .zip file → unzip → verify data.json + images/ folder
7. Click "Import" → select the .zip → data restored with images
8. Import old .json file → works without images

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "Fix issues found during smoke testing"
```
