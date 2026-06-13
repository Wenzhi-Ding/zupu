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
