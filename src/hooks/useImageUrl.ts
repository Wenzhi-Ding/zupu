import { useState, useEffect } from 'react';
import { getImage } from '../store/imageDb';
import { useFamilyStore } from '../store/familyStore';

export function useImageUrl(imageId: string | undefined): string | null {
  const [state, setState] = useState<{ id: string | undefined; url: string | null }>({ id: undefined, url: null });

  useEffect(() => {
    if (!imageId) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    getImage(imageId).then((result) => {
      if (cancelled) return;
      if (result) {
        objectUrl = URL.createObjectURL(result.blob);
        setState({ id: imageId, url: objectUrl });
      } else {
        setState({ id: imageId, url: null });
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  return state.id === imageId ? state.url : null;
}

export function useAvatarUrl(personId: string | undefined): string | null {
  const avatarImageId = useFamilyStore((s) =>
    personId ? s.persons[personId]?.avatarImageId : undefined,
  );
  return useImageUrl(avatarImageId);
}
