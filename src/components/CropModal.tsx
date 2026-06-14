import React, { useState, useCallback, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
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
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const t = useT();

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const size = Math.min(width, height) * 0.8;
    const c: PixelCrop = {
      unit: 'px',
      x: (width - size) / 2,
      y: (height - size) / 2,
      width: size,
      height: size,
    };
    setCrop(c);
    setCompletedCrop(c);
  }, []);

  const produceCroppedBlob = async (): Promise<Blob> => {
    if (!completedCrop || !imgRef.current) return sourceBlob;

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
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
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            minWidth={20}
            minHeight={20}
            keepSelection
          >
            <img
              ref={imgRef}
              src={sourceUrl}
              onLoad={onImageLoad}
              alt="Crop preview"
              style={{ maxHeight: '400px' }}
            />
          </ReactCrop>
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
