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
