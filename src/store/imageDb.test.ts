// @vitest-environment node

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
