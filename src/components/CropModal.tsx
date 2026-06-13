import React, { useState, useCallback } from 'react';
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
