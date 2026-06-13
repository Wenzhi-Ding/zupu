import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../store/imageDb', () => ({
  getImage: vi.fn(),
}));

import { getImage } from '../store/imageDb';
import { useImageUrl } from './useImageUrl';

describe('useImageUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('returns null for undefined imageId', () => {
    const { result } = renderHook(() => useImageUrl(undefined));
    expect(result.current).toBeNull();
  });

  it('returns null for non-existent image', async () => {
    vi.mocked(getImage).mockResolvedValue(null);
    const { result } = renderHook(() => useImageUrl('nonexistent'));
    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('returns object URL for existing image', async () => {
    const blob = new Blob(['data']);
    vi.mocked(getImage).mockResolvedValue({ blob, format: 'jpeg' });
    const { result } = renderHook(() => useImageUrl('img-test'));
    await waitFor(() => {
      expect(result.current).not.toBeNull();
      expect(result.current).toMatch(/^blob:/);
    });
  });
});
